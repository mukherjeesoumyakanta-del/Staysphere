import { listingRepository } from "../repositories/listingRepository.js";
import { ApiError } from "../utils/ApiError.js";

export function createListingService(config, listings = listingRepository) {
  return {
    async search(query) {
      return listings.search(query);
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
      return listings.create({ ...data, hostId, images });
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
