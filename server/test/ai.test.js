import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../src/app.js";
import { validateAiFilters, createAiService } from "../src/services/aiService.js";
import { createAiClient } from "../src/services/aiProvider.js";

function getTestConfig() {
  return {
    nodeEnv: "test",
    port: 0,
    origins: ["http://localhost:5173"],
    mongoUri: "mock://mongodb",
    jwtSecret: "test-secret-that-is-at-least-32-chars-long!",
    jwtTtlSeconds: 3600,
    aiApiKey: "test-fake-key",
    aiModel: "gemini-1.5-flash",
    aiProvider: "gemini",
  };
}

function createMockListingRepo(listings = []) {
  let store = [...listings];
  return {
    async search({ city, maxPrice, minPrice, maxGuests, bedrooms, propertyType, amenities, limit = 20 } = {}) {
      let results = store.filter((l) => l.status === "ACTIVE");

      if (city) {
        const c = city.toLowerCase();
        results = results.filter((l) =>
          (l.city || l.location || "").toLowerCase().includes(c)
        );
      }
      if (maxPrice !== undefined) {
        results = results.filter((l) => (l.pricePerNight || l.price || 0) <= maxPrice);
      }
      if (minPrice !== undefined) {
        results = results.filter((l) => (l.pricePerNight || l.price || 0) >= minPrice);
      }
      if (maxGuests !== undefined) {
        results = results.filter((l) => (l.maxGuests || l.guests || 1) >= maxGuests);
      }
      if (bedrooms !== undefined) {
        results = results.filter((l) => (l.bedrooms || 0) >= bedrooms);
      }
      if (propertyType) {
        results = results.filter((l) => (l.propertyType || l.type) === propertyType);
      }
      if (amenities && amenities.length > 0) {
        results = results.filter((l) =>
          amenities.every((a) => (l.amenities || []).includes(a))
        );
      }

      return {
        listings: results.slice(0, limit),
        total: results.length,
      };
    },
    async findById(id) {
      return store.find((l) => String(l._id || l.id) === String(id)) || null;
    },
  };
}

function createMockUsersRepo() {
  const users = [
    {
      _id: "host-1",
      id: "host-1",
      email: "host@test.dev",
      name: "Host User",
      role: "HOST",
      passwordHash: "hash",
    },
    {
      _id: "guest-1",
      id: "guest-1",
      email: "guest@test.dev",
      name: "Guest User",
      role: "GUEST",
      passwordHash: "hash",
    },
  ];
  return {
    async findByEmail(email) {
      return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
    },
    async findById(id) {
      return users.find((u) => String(u._id || u.id) === String(id)) || null;
    },
    async create(u) {
      users.push(u);
      return u;
    },
  };
}

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

test("Filter schema validation allows only supported keys and strips malicious operators", () => {
  const dirty = {
    city: "Goa",
    maxPrice: "5000",
    minPrice: "1000",
    guests: "4",
    bedrooms: "2",
    propertyType: "Villa",
    amenities: ["WiFi", "Pool", "InvalidAmenity"],
    $where: "function() { return true; }",
    __proto__: { isAdmin: true },
    hack: { $ne: null },
  };

  const clean = validateAiFilters(dirty);

  assert.equal(clean.city, "Goa");
  assert.equal(clean.maxPrice, 5000);
  assert.equal(clean.minPrice, 1000);
  assert.equal(clean.guests, 4);
  assert.equal(clean.bedrooms, 2);
  assert.equal(clean.propertyType, "Villa");
  assert.deepEqual(clean.amenities, ["WiFi", "Pool"]);
  assert.equal(clean.$where, undefined);
  assert.equal(clean.hack, undefined);
  assert.equal(clean.__proto__.isAdmin, undefined);
});

test("Filter schema validation handles nulls, negative numbers, and empty strings gracefully", () => {
  const edge = {
    city: "   ",
    maxPrice: -500,
    minPrice: -100,
    guests: 0,
    bedrooms: -1,
    propertyType: "Submarine",
    amenities: "not an array",
  };

  const clean = validateAiFilters(edge);
  assert.deepEqual(clean, {});
});

test("AI search returns real grounded MongoDB ACTIVE listings and filters correctly", async () => {
  const mockListings = [
    {
      _id: "villa-goa",
      title: "Casa Sunset",
      city: "Goa",
      propertyType: "Villa",
      pricePerNight: 4500,
      maxGuests: 6,
      bedrooms: 3,
      amenities: ["WiFi", "Pool"],
      status: "ACTIVE",
    },
    {
      _id: "draft-villa-goa",
      title: "Secret Villa",
      city: "Goa",
      propertyType: "Villa",
      pricePerNight: 3000,
      maxGuests: 4,
      amenities: ["WiFi"],
      status: "DRAFT", // Must NOT be returned
    },
    {
      _id: "cabin-manali",
      title: "Pine Retreat",
      city: "Manali",
      propertyType: "Cabin",
      pricePerNight: 3500,
      maxGuests: 2,
      bedrooms: 1,
      amenities: ["Mountain view"],
      status: "ACTIVE",
    },
  ];

  const listingRepo = createMockListingRepo(mockListings);
  const service = createAiService(getTestConfig(), {
    aiClient: {
      isConfigured: () => false, // fallback extractor test
    },
    listingRepo,
  });

  const res = await service.searchListings("villa in Goa under 5000 with wifi");

  assert.equal(res.total, 1);
  assert.equal(res.listings[0]._id, "villa-goa");
  assert.equal(res.listings[0].status, "ACTIVE");
  assert.ok(res.explanation.includes("Found 1 active property"));
});

test("AI search rejects prompts that are empty or exceed 500 characters", async () => {
  const service = createAiService(getTestConfig(), {
    aiClient: { isConfigured: () => false },
    listingRepo: createMockListingRepo([]),
  });

  await assert.rejects(
    async () => service.searchListings("   "),
    /Search prompt is required/
  );

  const longPrompt = "a".repeat(501);
  await assert.rejects(
    async () => service.searchListings(longPrompt),
    /Search prompt must be at most 500 characters/
  );
});

test("AI description generation generates factual grounded description from facts", async () => {
  const service = createAiService(getTestConfig(), {
    aiClient: { isConfigured: () => false },
  });

  const facts = {
    title: "Azure Bay Villa",
    location: "Anjuna, Goa",
    propertyType: "Villa",
    bedrooms: 3,
    bathrooms: 3,
    maxGuests: 6,
    pricePerNight: 7500,
    amenities: ["WiFi", "Pool", "Kitchen"],
    highlights: "Private chef on request",
  };

  const res = await service.generateListingDescription(facts);

  assert.ok(res.description);
  assert.ok(res.description.includes("Azure Bay Villa"));
  assert.ok(res.description.includes("Anjuna, Goa"));
  assert.ok(res.description.includes("WiFi, Pool, Kitchen"));
});

test("POST /api/ai/description rejects unauthenticated requests with 401", async () => {
  const config = getTestConfig();
  const app = createApp(config, {
    users: createMockUsersRepo(),
    listings: createMockListingRepo(),
  });
  const serverInstance = await startServer(app);

  try {
    const res = await fetch(`${serverInstance.baseUrl}/api/ai/description`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Property",
        location: "Goa",
      }),
    });

    assert.equal(res.status, 401);
  } finally {
    await serverInstance.close();
  }
});

test("POST /api/ai/search is public and returns 200 with structured results", async () => {
  const config = getTestConfig();
  const listings = [
    {
      _id: "p-1",
      title: "Goa Beach Villa",
      city: "Goa",
      propertyType: "Villa",
      pricePerNight: 4000,
      maxGuests: 4,
      bedrooms: 2,
      amenities: ["WiFi"],
      status: "ACTIVE",
    },
  ];
  const app = createApp(config, {
    users: createMockUsersRepo(),
    listings: createMockListingRepo(listings),
  });
  const serverInstance = await startServer(app);

  try {
    const res = await fetch(`${serverInstance.baseUrl}/api/ai/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "villa in Goa under 5000",
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data);
    assert.equal(json.data.total, 1);
    assert.equal(json.data.listings[0].title, "Goa Beach Villa");
    assert.equal(json.data.filters.city, "Goa");
  } finally {
    await serverInstance.close();
  }
});
