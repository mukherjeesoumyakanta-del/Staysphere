import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config/env.js";
import { serializePublicListing } from "../src/serializers/listingSerializer.js";
import { serializeGuestBooking, serializeHostBooking } from "../src/serializers/bookingSerializer.js";
import { serializeSafeUser } from "../src/serializers/userSerializer.js";
import { aiPrivacyService } from "../src/services/aiPrivacyService.js";
import { createAiService } from "../src/services/aiService.js";

const secret = randomBytes(48).toString("hex");

function makeConfig() {
  return getConfig({
    PORT: 0,
    CLIENT_URL: "http://localhost:5173",
    MONGO_URI: "mongodb://127.0.0.1:27017/staysphere-test",
    JWT_SECRET: secret,
    NODE_ENV: "development",
  });
}

function userFixture() {
  const records = new Map();
  return {
    findByEmail: async (email) =>
      [...records.values()].find((u) => u.email === email) || null,
    findById: async (id) => records.get(id) || null,
    create: async (input) => {
      const user = {
        ...input,
        _id: new mongoose.Types.ObjectId().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(user._id, user);
      return user;
    },
    updateProfile: async (id, values) => {
      const user = records.get(id);
      if (!user) return null;
      // Protected: never update role or passwordHash via profile
      delete values.role;
      delete values.passwordHash;
      delete values._id;
      Object.assign(user, values, { updatedAt: new Date() });
      return user;
    },
    _records: records,
  };
}

function listingFixture() {
  const records = new Map();
  return {
    async search() {
      const list = [...records.values()].filter((l) => l.status === "ACTIVE");
      return { listings: list.map(serializePublicListing), total: list.length, page: 1, pages: 1 };
    },
    async findById(id) {
      const doc = records.get(id);
      return doc ? serializePublicListing(doc) : null;
    },
    async findByHost(hostId) {
      return [...records.values()].filter((l) => String(l.hostId) === String(hostId));
    },
    async create(data) {
      const id = new mongoose.Types.ObjectId().toString();
      const doc = { _id: id, ...data, createdAt: new Date(), updatedAt: new Date() };
      records.set(id, doc);
      return doc;
    },
    async update(id, data) {
      const doc = records.get(id);
      if (!doc) return null;
      Object.assign(doc, data, { updatedAt: new Date() });
      return doc;
    },
    async remove(id) {
      records.delete(id);
    },
    _records: records,
  };
}

test("Privacy Serializer: serializePublicListing omits private host fields and password hashes", () => {
  const fullDoc = {
    _id: new mongoose.Types.ObjectId(),
    title: "Seaside Villa",
    description: "Peaceful villa on the beach",
    city: "Goa",
    state: "Goa",
    location: "Goa, India",
    propertyType: "Villa",
    pricePerNight: 8500,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["WiFi", "Pool"],
    images: [{ url: "https://example.com/img1.jpg", publicId: "p1" }],
    status: "ACTIVE",
    viewCount: 42,
    hostId: {
      _id: new mongoose.Types.ObjectId(),
      name: "John Host",
      email: "host.private@example.com",
      phone: "+919876543210",
      passwordHash: "$2a$12$fakehashnotreal",
      role: "HOST",
    },
    __v: 0,
  };

  const serialized = serializePublicListing(fullDoc);

  assert.equal(serialized.title, "Seaside Villa");
  assert.equal(serialized.pricePerNight, 8500);
  assert.ok(serialized.hostId, "HostId should be present as an opaque ID");
  assert.equal(typeof serialized.hostId, "string");
  // CRITICAL PRIVACY CHECKS:
  assert.equal(serialized.email, undefined);
  assert.equal(serialized.phone, undefined);
  assert.equal(serialized.passwordHash, undefined);
  assert.equal(serialized.__v, undefined);
  assert.equal(typeof serialized.hostId, "string");
  assert.ok(!serialized.hostId.includes("host.private@example.com"));
});

test("Privacy Serializer: serializeSafeUser omits passwordHash and internal fields", () => {
  const userDoc = {
    _id: new mongoose.Types.ObjectId(),
    name: "Jane Doe",
    email: "jane@example.com",
    role: "GUEST",
    passwordHash: "$2a$12$supersecretpasswordhash",
    __v: 0,
  };

  const safe = serializeSafeUser(userDoc);
  assert.equal(safe.name, "Jane Doe");
  assert.equal(safe.email, "jane@example.com");
  assert.equal(safe.passwordHash, undefined);
  assert.equal(safe.__v, undefined);
});

test("NoSQL Operator Injection in query params is rejected with 400", async () => {
  const config = makeConfig();
  const users = userFixture();
  const listings = listingFixture();
  const app = createApp(config, { users, listings });

  const res = await request(app)
    .get("/api/listings?city[$ne]=nonexistent")
    .set("Accept", "application/json");

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "INVALID_INPUT");
  assert.ok(res.body.error.message.includes("Prohibited query operator"));
});

test("Stored XSS: string inputs with HTML tags are stripped by sanitizeInputMiddleware", async () => {
  const config = makeConfig();
  const users = userFixture();
  const listings = listingFixture();
  const app = createApp(config, { users, listings });

  // Register host
  const regRes = await request(app)
    .post("/api/auth/register")
    .set("Origin", "http://localhost:5173")
    .set("X-CSRF-Protection", "1")
    .send({
      name: "Clean Host",
      email: "cleanhost@example.com",
      password: "password123!",
      role: "HOST",
    });
  assert.equal(regRes.status, 201);
  const cookie = regRes.headers["set-cookie"];

  // Post listing with XSS in title & description
  const createRes = await request(app)
    .post("/api/listings")
    .set("Origin", "http://localhost:5173")
    .set("Cookie", cookie)
    .set("X-CSRF-Protection", "1")
    .field("title", "<script>alert('xss')</script>Safe Luxury Villa")
    .field("description", "<img src=x onerror=alert(1)>A pristine tranquil retreat in North Goa.")
    .field("city", "Goa")
    .field("state", "Goa")
    .field("location", "Goa, India")
    .field("propertyType", "Villa")
    .field("pricePerNight", "6000")
    .field("maxGuests", "4")
    .field("bedrooms", "2")
    .field("bathrooms", "2")
    .field("status", "ACTIVE");

  assert.equal(createRes.status, 201);
  const created = createRes.body.data;
  assert.ok(!created.title.includes("<script>"), "HTML script tag should be stripped");
  assert.ok(created.title.includes("Safe Luxury Villa"));
  assert.ok(!created.description.includes("<img"), "HTML img tag should be stripped");
});

test("Gemini Privacy Spy: Prompts NEVER include user emails, phone numbers, or credentials", async () => {
  let capturedPrompt = "";

  const mockAiClient = {
    provider: "gemini",
    model: "gemini-1.5-flash",
    isConfigured: () => true,
    async generateText(prompt) {
      capturedPrompt = prompt;
      return {
        text: JSON.stringify({ city: "Goa", maxPrice: 8000 }),
        provider: "gemini",
        model: "gemini-1.5-flash",
      };
    },
  };

  const listings = listingFixture();
  const aiService = createAiService({}, { aiClient: mockAiClient, listingRepo: listings });

  // User includes email, phone number, and a MongoDB ID in the search prompt
  const dirtyPrompt = "Looking for a villa near goa for john.doe@secret.com or call 9876543210 with id 6afadde5ec01aad82312a82b";
  await aiService.searchListings(dirtyPrompt);

  // Assert spy captured prompt
  assert.ok(capturedPrompt.length > 0, "generateText must have been called");
  assert.ok(!capturedPrompt.includes("john.doe@secret.com"), "Guest email must be redacted");
  assert.ok(!capturedPrompt.includes("9876543210"), "Guest phone number must be redacted");
  assert.ok(!capturedPrompt.includes("6afadde5ec01aad82312a82b"), "MongoDB ObjectId must be redacted");
  assert.ok(capturedPrompt.includes("[REDACTED_EMAIL]"));
  assert.ok(capturedPrompt.includes("[REDACTED_PHONE]"));
  assert.ok(capturedPrompt.includes("[REDACTED_ID]"));
});

test("Gemini Privacy Spy: Host description generation scrubs private door/street addresses", async () => {
  let capturedPrompt = "";

  const mockAiClient = {
    provider: "gemini",
    model: "gemini-1.5-flash",
    isConfigured: () => true,
    async generateText(prompt) {
      capturedPrompt = prompt;
      return {
        text: "A beautiful villa in Assagao with scenic views.",
        provider: "gemini",
        model: "gemini-1.5-flash",
      };
    },
  };

  const listings = listingFixture();
  const aiService = createAiService({}, { aiClient: mockAiClient, listingRepo: listings });

  await aiService.generateListingDescription({
    title: "Private Villa",
    city: "Flat 402, Assagao",
    state: "Goa",
    propertyType: "Villa",
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    highlights: "Contact host at host.private@example.com or +919123456789",
  });

  assert.ok(capturedPrompt.length > 0);
  assert.ok(!capturedPrompt.includes("host.private@example.com"), "Host email in highlights must be redacted");
  assert.ok(!capturedPrompt.includes("+919123456789"), "Host phone in highlights must be redacted");
  assert.ok(!capturedPrompt.includes("Flat 402"), "Door/flat numbers must be scrubbed");
});

test("Timing Middleware adds Server-Timing header to responses", async () => {
  const config = makeConfig();
  const users = userFixture();
  const listings = listingFixture();
  const app = createApp(config, { users, listings });

  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.ok(res.headers["server-timing"], "Server-Timing header must be present");
  assert.match(res.headers["server-timing"], /total;dur=\d+(\.\d+)?/);
});

test("Performance endpoint GET /api/dev/performance returns latency metrics", async () => {
  const config = makeConfig();
  const users = userFixture();
  const listings = listingFixture();
  const app = createApp(config, { users, listings });

  // Make a couple requests to populate ring buffer
  await request(app).get("/api/health");
  await request(app).get("/api/listings");

  const perfRes = await request(app).get("/api/dev/performance");
  assert.equal(perfRes.status, 200);
  const data = perfRes.body.data;
  assert.ok(data.count >= 2, "Should have recorded requests in ring buffer");
  assert.ok(typeof data.avgMs === "number");
  assert.ok(typeof data.p50Ms === "number");
  assert.ok(typeof data.p95Ms === "number");
  assert.ok(Array.isArray(data.recent));
});

test("HTTP Caching: GET /api/listings has public cache header, /api/auth has no-store", async () => {
  const config = makeConfig();
  const users = userFixture();
  const listings = listingFixture();
  const app = createApp(config, { users, listings });

  const publicRes = await request(app).get("/api/listings");
  assert.equal(publicRes.status, 200);
  assert.match(
    publicRes.headers["cache-control"],
    /public,\s*max-age=\d+,\s*stale-while-revalidate=\d+/
  );

  const authRes = await request(app).get("/api/auth/me");
  assert.ok(
    authRes.headers["cache-control"]?.includes("no-store"),
    "Auth endpoint must include no-store in Cache-Control"
  );
});
