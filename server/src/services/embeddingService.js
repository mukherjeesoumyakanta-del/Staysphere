/**
 * Embedding Service for StaySphere Semantic Vector Search.
 * Interfaces with Google Gemini Embedding API (text-embedding-004)
 * to generate 768-dimensional dense vectors for property indexing and semantic search.
 */

const DEFAULT_MODEL = "gemini-embedding-001";
const TARGET_DIMENSIONS = 768;

/**
 * Builds a deterministic, normalized 768-dimensional vector from text
 * for hermetic testing or when external API is mocked.
 */
export function generateMockEmbedding(text = "", dimensions = TARGET_DIMENSIONS) {
  const vector = new Array(dimensions).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dimensions; i++) {
    const val = Math.sin(hash + i * 0.1) * 0.5;
    vector[i] = Number(val.toFixed(6));
  }
  // Normalize vector to unit length (L2 norm = 1.0 for cosine similarity)
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * Normalizes property fields into a unified searchable text string.
 * Whitelists only relevant guest-experience attributes:
 * title, description, property type, location, amenities, and highlights.
 * Excludes all private user records, host details, prices, or credentials.
 */
export function buildPropertySearchText(listing = {}) {
  const parts = [];

  const title = String(listing.title || listing.name || "").trim();
  if (title) parts.push(title);

  const type = String(listing.propertyType || listing.type || "").trim();
  const city = String(listing.city || "").trim();
  const state = String(listing.state || "").trim();
  const location = String(listing.location || [city, state].filter(Boolean).join(", ")).trim();

  if (type || location) {
    parts.push([type, location ? `in ${location}` : ""].filter(Boolean).join(" "));
  }

  const bedrooms = Number(listing.bedrooms);
  const maxGuests = Number(listing.maxGuests || listing.guests);
  const specs = [];
  if (Number.isFinite(bedrooms) && bedrooms > 0) {
    specs.push(`${bedrooms} bedroom${bedrooms > 1 ? "s" : ""}`);
  }
  if (Number.isFinite(maxGuests) && maxGuests > 0) {
    specs.push(`accommodates up to ${maxGuests} guests`);
  }
  if (specs.length > 0) {
    parts.push(specs.join(", "));
  }

  const desc = String(listing.description || "").trim();
  if (desc) parts.push(desc);

  if (Array.isArray(listing.amenities) && listing.amenities.length > 0) {
    const cleanAmenities = listing.amenities
      .filter((a) => typeof a === "string" && a.trim().length > 0)
      .join(", ");
    if (cleanAmenities) {
      parts.push(`Amenities: ${cleanAmenities}`);
    }
  }

  const highlights = String(listing.highlights || "").trim();
  if (highlights) parts.push(`Highlights: ${highlights}`);

  return parts.join(". ").replace(/\.\s*\./g, ".").slice(0, 2000).trim();
}

export function createEmbeddingService(config = {}) {
  const apiKey = config.embeddingApiKey || config.aiApiKey || process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY || "";
  const model = config.embeddingModel || process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
  const dimensions = Number(config.embeddingDimensions || process.env.EMBEDDING_DIMENSIONS) || TARGET_DIMENSIONS;
  const isTest = config.nodeEnv === "test" || process.env.NODE_ENV === "test";

  return {
    model,
    dimensions,

    isConfigured() {
      return typeof apiKey === "string" && apiKey.trim().length > 0 && !apiKey.includes("YOUR_");
    },

    buildSearchText: buildPropertySearchText,

    /**
     * Generates a dense 768-dimensional embedding vector using Google Gemini.
     * @param {string} text - Input text to embed
     * @param {string} taskType - 'RETRIEVAL_DOCUMENT' (for indexing) or 'RETRIEVAL_QUERY' (for search)
     * @returns {Promise<number[]>} Array of 768 floating-point numbers
     */
    async generateEmbedding(text, taskType = "RETRIEVAL_DOCUMENT") {
      if (!text || typeof text !== "string") {
        throw new Error("Text is required for embedding generation");
      }

      const cleanText = text.trim().slice(0, 2048);
      if (cleanText.length < 2) {
        throw new Error("Text must be at least 2 characters for embedding generation");
      }

      // If in test mode or unconfigured with mock flag, return deterministic unit vector
      if (isTest && (!this.isConfigured() || apiKey.startsWith("test-") || apiKey.startsWith("mock-"))) {
        return generateMockEmbedding(cleanText, dimensions);
      }

      if (!this.isConfigured()) {
        throw new Error("Embedding API key is not configured. Set EMBEDDING_API_KEY or AI_API_KEY in server/.env.");
      }

      const modelName = model.replace(/^models\//, "");
      const modelPath = `models/${modelName}`;
      const signal = AbortSignal.timeout(15000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelName
      )}:embedContent?key=${encodeURIComponent(apiKey)}`;

      try {
        const reqBody = {
          model: modelPath,
          content: {
            parts: [{ text: cleanText }],
          },
        };
        if (taskType) reqBody.taskType = taskType;
        if (dimensions) reqBody.outputDimensionality = dimensions;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
          signal,
        });

        if (!response.ok) {
          let errText = await response.text().catch(() => "");
          if (apiKey) errText = errText.replaceAll(apiKey, "[REDACTED_KEY]");
          throw new Error(`Gemini Embedding API failed (${response.status}): ${errText || response.statusText}`);
        }

        const data = await response.json();
        const values = data?.embedding?.values;

        if (!Array.isArray(values) || values.length === 0) {
          throw new Error("Gemini Embedding API returned empty vector data.");
        }

        if (values.length !== dimensions) {
          throw new Error(
            `Embedding dimension mismatch: expected ${dimensions}, received ${values.length}`
          );
        }

        // Validate all vector values are finite numbers
        for (let i = 0; i < values.length; i++) {
          if (!Number.isFinite(values[i])) {
            throw new Error(`Invalid non-finite value in vector at index ${i}`);
          }
        }

        return values;
      } catch (err) {
        let msg = err.message || "Failed to generate embedding vector";
        if (apiKey) msg = msg.replaceAll(apiKey, "[REDACTED_KEY]");
        throw new Error(msg);
      }
    },
  };
}

export const embeddingService = createEmbeddingService();
