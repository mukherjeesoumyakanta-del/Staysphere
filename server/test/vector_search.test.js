import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPropertySearchText,
  generateMockEmbedding,
  createEmbeddingService,
} from "../src/services/embeddingService.js";
import { createListingService } from "../src/services/listingService.js";

test("Vector Search - buildPropertySearchText normalizes safe attributes and excludes private data", () => {
  const listing = {
    title: "Luxury Cliffside Villa",
    propertyType: "Villa",
    city: "Goa",
    state: "Goa",
    location: "Anjuna, Goa",
    bedrooms: 4,
    maxGuests: 8,
    description: "Panoramic Arabian Sea views with a private infinity pool.",
    amenities: ["Wi-Fi", "Pool", "Air Conditioning", "Chef on Demand"],
    highlights: "Direct beach trail and sunset deck",
    // Sensitive/Private data that must NOT leak into search text:
    pricePerNight: 25000,
    hostEmail: "secret.host@example.com",
    hostPhone: "+919876543210",
    passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
    secretKey: "supersecret123",
  };

  const text = buildPropertySearchText(listing);

  assert.ok(text.includes("Luxury Cliffside Villa"), "Search text must contain title");
  assert.ok(text.includes("Villa in Anjuna, Goa"), "Search text must contain type and location");
  assert.ok(text.includes("4 bedrooms, accommodates up to 8 guests"), "Search text must contain capacity");
  assert.ok(text.includes("Panoramic Arabian Sea views"), "Search text must contain description");
  assert.ok(text.includes("Amenities: Wi-Fi, Pool"), "Search text must contain amenities");
  assert.ok(text.includes("Highlights: Direct beach trail"), "Search text must contain highlights");

  // Verify private fields are absent:
  assert.ok(!text.includes("25000"), "Price must not be in embedding search text");
  assert.ok(!text.includes("secret.host@example.com"), "Host email must not be in search text");
  assert.ok(!text.includes("9876543210"), "Host phone must not be in search text");
  assert.ok(!text.includes("passwordHash"), "Password hash must not be in search text");
  assert.ok(!text.includes("supersecret123"), "Secrets must not be in search text");
});

test("Vector Search - generateMockEmbedding produces normalized 768-dimensional unit vector", () => {
  const text = "Modern studio apartment in central city with high-speed internet";
  const vec1 = generateMockEmbedding(text, 768);
  const vec2 = generateMockEmbedding(text, 768);

  assert.equal(vec1.length, 768, "Must produce exactly 768 dimensions");
  assert.deepEqual(vec1, vec2, "Must be deterministic for identical input text");

  // Check L2 norm is ~1.0 (unit vector for cosine distance)
  const norm = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  assert.ok(Math.abs(norm - 1.0) < 0.001, `Vector norm must be ~1.0, got ${norm}`);

  // Distinct texts produce distinct vectors
  const vecOther = generateMockEmbedding("Rustic cabin in snowy pine forest", 768);
  assert.notDeepEqual(vec1, vecOther, "Different inputs must produce different vectors");
});

test("Vector Search - createEmbeddingService operates safely in test mode", async () => {
  const service = createEmbeddingService({
    nodeEnv: "test",
    embeddingApiKey: "mock-key",
    embeddingDimensions: 768,
  });

  const vector = await service.generateEmbedding("Peaceful mountain homestay", "RETRIEVAL_DOCUMENT");
  assert.equal(vector.length, 768, "Should generate 768 dimensions in test mode");
  for (const v of vector) {
    assert.ok(Number.isFinite(v), "Every vector dimension must be a finite number");
  }
});

test("Vector Search - listingService integrates embedding generation on create", async () => {
  const mockCreatedDocs = [];
  const mockRepo = {
    async create(doc) {
      const saved = { ...doc, _id: "mock-listing-123" };
      mockCreatedDocs.push(saved);
      return saved;
    },
    async list() { return { listings: [], total: 0, page: 1, pages: 1 }; },
    async findById(id) { return mockCreatedDocs.find((d) => d._id === id) || null; },
  };

  const service = createListingService({
    nodeEnv: "test",
    embeddingApiKey: "mock-key",
    embeddingDimensions: 768,
  }, mockRepo);

  const listing = await service.create("host-1", {
    title: "Eco Bamboo Villa",
    propertyType: "Villa",
    city: "Ubud",
    state: "Bali",
    location: "Ubud, Bali",
    pricePerNight: 8500,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    description: "Serene bamboo eco sanctuary surrounded by rice fields.",
  }, []);

  assert.ok(listing._id, "Listing must be created");
  assert.ok(listing.searchText.includes("Eco Bamboo Villa"), "Search text must be populated");
  assert.equal(listing.embeddingStatus, "COMPLETED", "Status must be COMPLETED");
  assert.equal(listing.embedding.length, 768, "Must store 768-dimensional embedding");
});

test("Vector Search - listingService skips vector regeneration when searchable text is unchanged", async () => {
  let updatedPayload = null;
  const existingDoc = {
    _id: "listing-456",
    hostId: "host-1",
    title: "Hillside Cottage",
    propertyType: "Cottage",
    city: "Shimla",
    state: "Himachal Pradesh",
    pricePerNight: 4000,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    description: "Quiet stay with mountain view.",
    searchText: "Hillside Cottage. Cottage in Shimla, Himachal Pradesh. 1 bedroom, accommodates up to 2 guests. Quiet stay with mountain view.",
    embedding: generateMockEmbedding("Hillside Cottage", 768),
    embeddingStatus: "COMPLETED",
  };

  const mockRepo = {
    async findById(id) { return existingDoc; },
    async update(id, patch) {
      updatedPayload = patch;
      return { ...existingDoc, ...patch };
    },
  };

  const service = createListingService({
    nodeEnv: "test",
    embeddingApiKey: "mock-key",
  }, mockRepo);

  // Updating only pricePerNight (does not affect searchable text)
  await service.update("listing-456", "host-1", { pricePerNight: 4500 });

  assert.ok(updatedPayload, "Update must execute");
  assert.equal(updatedPayload.pricePerNight, 4500, "Price must be updated");
  assert.equal(updatedPayload.embedding, undefined, "Embedding must not be regenerated when text is unchanged");
});
