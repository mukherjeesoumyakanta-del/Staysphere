import { listingRepository } from "../repositories/listingRepository.js";
import { ApiError } from "../utils/ApiError.js";
import { createEmbeddingService } from "./embeddingService.js";

export function createListingService(
  config = {},
  listings = listingRepository,
  embedService = createEmbeddingService(config)
) {
  return {
    async search(query = {}) {
      const queryText = (query.search || query.q || "").trim();
      let queryVector = null;

      // Generate query embedding if search query text is present and vector search is enabled
      if (queryText.length >= 2 && config.vectorSearchEnabled !== false) {
        try {
          if (embedService.isConfigured() || config.nodeEnv === "test") {
            queryVector = await embedService.generateEmbedding(queryText, "RETRIEVAL_QUERY");
          }
        } catch (err) {
          console.warn("Failed to generate query embedding, using keyword fallback:", err.message);
        }
      }

      return listings.search({
        ...query,
        queryVector,
        vectorIndexName: config.vectorIndexName || "property_vector_index",
      });
    },

    async getOne(id) {
      const doc = await listings.findById(id);
      if (!doc) throw new ApiError(404, "NOT_FOUND", "Listing not found");
      return doc;
    },

    async getHostListings(hostId) {
      return listings.findByHost(hostId);
    },

    async create(hostId, data, images = []) {
      const searchText = embedService.buildSearchText(data);
      const listingData = {
        ...data,
        hostId,
        images,
        searchText,
      };

      try {
        if (embedService.isConfigured() || config.nodeEnv === "test") {
          const vector = await embedService.generateEmbedding(searchText, "RETRIEVAL_DOCUMENT");
          listingData.embedding = vector;
          listingData.embeddingStatus = "COMPLETED";
          listingData.embeddingModel = embedService.model;
          listingData.embeddingUpdatedAt = new Date();
        } else {
          listingData.embeddingStatus = "PENDING";
        }
      } catch (err) {
        console.warn("Embedding generation failed during property create (will backfill):", err.message);
        listingData.embeddingStatus = "FAILED";
      }

      return listings.create(listingData);
    },

    async update(listingId, hostId, data, newImages = []) {
      const doc = await listings.findById(listingId);
      if (!doc) throw new ApiError(404, "NOT_FOUND", "Listing not found");
      if (doc.hostId.toString() !== hostId.toString())
        throw new ApiError(403, "FORBIDDEN", "You do not own this listing");

      const updateData = { ...data };
      if (newImages.length > 0) {
        updateData.images = [...(doc.images || []), ...newImages];
      }

      const merged = { ...doc, ...updateData };
      const newSearchText = embedService.buildSearchText(merged);

      // Only regenerate vector if searchable text changed or embedding missing
      const shouldRegenerate =
        newSearchText !== doc.searchText ||
        !doc.embeddingStatus ||
        doc.embeddingStatus === "FAILED";

      if (shouldRegenerate) {
        updateData.searchText = newSearchText;
        try {
          if (embedService.isConfigured() || config.nodeEnv === "test") {
            const vector = await embedService.generateEmbedding(newSearchText, "RETRIEVAL_DOCUMENT");
            updateData.embedding = vector;
            updateData.embeddingStatus = "COMPLETED";
            updateData.embeddingModel = embedService.model;
            updateData.embeddingUpdatedAt = new Date();
          } else {
            updateData.embeddingStatus = "PENDING";
          }
        } catch (err) {
          console.warn("Embedding generation failed during property update (will backfill):", err.message);
          updateData.embeddingStatus = "FAILED";
        }
      }

      return listings.update(listingId, updateData);
    },

    async remove(listingId, hostId) {
      const doc = await listings.findById(listingId);
      if (!doc) throw new ApiError(404, "NOT_FOUND", "Listing not found");
      if (doc.hostId.toString() !== hostId.toString())
        throw new ApiError(403, "FORBIDDEN", "You do not own this listing");
      await listings.remove(listingId);
    },
  };
}
