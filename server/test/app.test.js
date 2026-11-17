import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config/env.js";
import {
  buildPropertySearchText,
  generateMockEmbedding,
  createEmbeddingService,
} from "../src/services/embeddingService.js";
import { aiPrivacyService } from "../src/services/aiPrivacyService.js";
import { getNightStrings } from "../src/repositories/bookingRepository.js";

const config = getConfig({
  NODE_ENV: "test",
  JWT_SECRET: "test-secret-at-least-32-characters-long!",
  CLIENT_URL: "http://localhost:5173",
});
const mockListings = {
  async search() {
    return {
      listings: [
        {
          id: "listing-1",
          title: "Beach Villa",
          propertyType: "Villa",
          city: "Goa",
          status: "ACTIVE",
          pricePerNight: 5000,
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    };
  },
  async findById(id) {
    return {
      id,
      title: "Beach Villa",
      status: "ACTIVE",
      pricePerNight: 5000,
    };
  },
};

const app = createApp(config, { listings: mockListings });

test("1. Health Endpoint returns 200 with security headers", async () => {
  const res = await request(app).get("/api/health").expect(200);
  assert.deepEqual(res.body, { data: { status: "ok", service: "staysphere-api" } });
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-powered-by"], undefined);
});

test("2. CORS allows configured origin and rejects unauthorized origins", async () => {
  const allowed = await request(app)
    .get("/api/health")
    .set("Origin", "http://localhost:5173")
    .expect(200);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:5173");
  assert.equal(allowed.headers["access-control-allow-credentials"], "true");

  const denied = await request(app)
    .get("/api/health")
    .set("Origin", "https://unauthorized-domain.com")
    .expect(403);
  assert.equal(denied.body.error.code, "ORIGIN_NOT_ALLOWED");
});

test("3. Unknown routes return standard 404 JSON format", async () => {
  const res = await request(app).get("/api/non-existent-route").expect(404);
  assert.deepEqual(res.body, {
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

test("4. Malformed JSON and oversized bodies are rejected", async () => {
  const malformed = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{invalidJson")
    .expect(400);
  assert.equal(malformed.body.error.code, "INVALID_JSON");

  const oversized = await request(app)
    .post("/api/auth/login")
    .send({ payload: "x".repeat(110 * 1024) })
    .expect(413);
  assert.equal(oversized.body.error.code, "BODY_TOO_LARGE");
});

test("5. Authentication: Unauthenticated access to protected routes returns 401", async () => {
  const res = await request(app).get("/api/auth/me").expect(401);
  assert.equal(res.body.error.code, "UNAUTHENTICATED");
});

test("6. Listings API: Public listings endpoint returns data array", async () => {
  const res = await request(app).get("/api/listings").expect(200);
  assert.ok(res.body.data, "Should return data object");
  assert.ok(Array.isArray(res.body.data.listings), "Should return listings array");
});

test("7. Vector Search: buildPropertySearchText normalizes safe fields and excludes prices/secrets", () => {
  const listing = {
    title: "Mountain Pine Chalet",
    propertyType: "Cabin",
    location: "Manali, Himachal Pradesh",
    bedrooms: 2,
    maxGuests: 4,
    description: "Peaceful wooden chalet overlooking snow-capped peaks.",
    amenities: ["WiFi", "Mountain view", "Kitchen"],
    pricePerNight: 7500,
    hostEmail: "secret.host@example.com",
    passwordHash: "secret-hash",
  };
  const text = buildPropertySearchText(listing);
  assert.ok(text.includes("Mountain Pine Chalet"));
  assert.ok(text.includes("Cabin in Manali"));
  assert.ok(text.includes("WiFi"));
  assert.ok(!text.includes("7500"), "Price must not be embedded");
  assert.ok(!text.includes("secret.host@example.com"), "Email must not be embedded");
  assert.ok(!text.includes("secret-hash"), "Hash must not be embedded");
});

test("8. Vector Search: generateMockEmbedding generates 768-dim normalized unit vector", () => {
  const vec = generateMockEmbedding("Peaceful hillside cottage", 768);
  assert.equal(vec.length, 768, "Must produce exactly 768 dimensions");
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  assert.ok(Math.abs(norm - 1.0) < 0.001, "L2 norm must be approximately 1.0 for cosine similarity");
});

test("9. AI Privacy Gateway: Redacts emails, phone numbers, and sensitive tokens", () => {
  const dirty = "Need a stay for test@example.com or call 9876543210 with id 6afadde5ec01aad82312a82b";
  const clean = aiPrivacyService.sanitizeSearchPrompt(dirty);
  assert.ok(!clean.includes("test@example.com"), "Email must be redacted");
  assert.ok(!clean.includes("9876543210"), "Phone must be redacted");
  assert.ok(!clean.includes("6afadde5ec01aad82312a82b"), "ObjectId must be redacted");
  assert.ok(clean.includes("[REDACTED_EMAIL]"));
  assert.ok(clean.includes("[REDACTED_PHONE]"));
});

test("10. Booking Interval Logic: getNightStrings correctly breaks down checkIn/checkOut", () => {
  const nights = getNightStrings("2026-12-01", "2026-12-04");
  assert.deepEqual(nights, ["2026-12-01", "2026-12-02", "2026-12-03"]);
  assert.equal(nights.length, 3);
});

test("11. Rate Limiting: Blocks excessive request spikes while health remains open", async () => {
  const rateLimitedApp = createApp(getConfig({ NODE_ENV: "test" }));
  for (let i = 0; i < 100; i++) {
    await request(rateLimitedApp).get("/api/not-found").expect(404);
  }
  const blocked = await request(rateLimitedApp).get("/api/not-found").expect(429);
  assert.equal(blocked.body.error.code, "RATE_LIMITED");
  // Health endpoint is skipped by rate limiter:
  await request(rateLimitedApp).get("/api/health").expect(200);
});
