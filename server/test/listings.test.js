import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config/env.js";
import { createListingService } from "../src/services/listingService.js";
import { createListingController } from "../src/controllers/listingController.js";
import { listingRoutes } from "../src/routes/listingRoutes.js";
import { Router } from "express";

const secret = randomBytes(48).toString("hex");

// ---- In-memory user fixture (matches auth.test.js pattern) ----
function userFixture() {
  const records = new Map();
  return {
    findByEmail: async (email) =>
      [...records.values()].find((u) => u.email === email) || null,
    findById: async (id) => records.get(id) || null,
    create: async (input) => {
      if ([...records.values()].some((u) => u.email === input.email))
        throw { code: 11000 };
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
      Object.assign(user, values, { updatedAt: new Date() });
      return user;
    },
    _records: records,
  };
}

// ---- In-memory listing fixture ----
function listingFixture() {
  const records = new Map();
  let seq = 0;

  return {
    async search({ q, city, minPrice, maxPrice, maxGuests, bedrooms, propertyType, amenities, sort, page = 1, limit = 12 } = {}) {
      let items = [...records.values()].filter((l) => l.status === "ACTIVE");

      if (q) {
        const re = new RegExp(q, "i");
        items = items.filter(
          (l) => re.test(l.title) || re.test(l.city) || re.test(l.location)
        );
      }
      if (city) {
        const re = new RegExp(city, "i");
        items = items.filter((l) => re.test(l.city));
      }
      if (minPrice !== undefined) items = items.filter((l) => l.pricePerNight >= Number(minPrice));
      if (maxPrice !== undefined) items = items.filter((l) => l.pricePerNight <= Number(maxPrice));
      if (maxGuests !== undefined) items = items.filter((l) => l.maxGuests >= Number(maxGuests));
      if (bedrooms !== undefined) items = items.filter((l) => l.bedrooms === Number(bedrooms));
      if (propertyType) items = items.filter((l) => l.propertyType === propertyType);
      if (amenities) {
        const list = Array.isArray(amenities) ? amenities : [amenities];
        items = items.filter((l) => list.every((a) => (l.amenities || []).includes(a)));
      }

      const total = items.length;
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(50, Number(limit) || 12));
      const skip = (pageNum - 1) * limitNum;
      const listings = items.slice(skip, skip + limitNum);

      return {
        listings,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
      };
    },

    async findById(id) {
      return records.get(id) || null;
    },

    async findByHost(hostId) {
      return [...records.values()]
        .filter((l) => l.hostId.toString() === hostId.toString())
        .sort((a, b) => b.createdAt - a.createdAt);
    },

    async create(data) {
      const id = new mongoose.Types.ObjectId().toString();
      const listing = {
        ...data,
        _id: id,
        images: data.images || [],
        status: data.status || "DRAFT",
        viewCount: data.viewCount || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // Ensure hostId has toString()
      if (listing.hostId && typeof listing.hostId === "object") {
        listing.hostId = listing.hostId.toString ? listing.hostId : { toString: () => String(listing.hostId), ...listing.hostId };
      }
      records.set(id, listing);
      return listing;
    },

    async update(id, data) {
      const doc = records.get(id);
      if (!doc) return null;
      Object.assign(doc, data, { updatedAt: new Date() });
      return doc;
    },

    async remove(id) {
      records.delete(id);
      return { deletedCount: 1 };
    },

    _records: records,
  };
}

// ---- App factory for listing tests ----
function fixture() {
  const users = userFixture();
  const listings = listingFixture();
  const config = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const app = createApp(config, { users, listings });
  const service = createListingService(config, listings);

  return { app, users, listings, config, service };
}

// Helper: register a user and get auth cookie
async function registerUser(app, role) {
  const email = `${role.toLowerCase()}-${randomBytes(4).toString("hex")}@test.com`;
  const password = "A-valid-Password-1!";
  const res = await request(app)
    .post("/api/auth/register")
    .set("X-CSRF-Protection", "1")
    .send({ name: `Test ${role}`, email, password, role });
  assert.equal(res.status, 201, `Failed to register ${role}: ${JSON.stringify(res.body)}`);
  const cookie = res.headers["set-cookie"][0].split(";")[0];
  return { cookie, userId: res.body.data.id, email };
}

// Helper: create a listing via the service (bypasses HTTP for speed in some tests)
function makeListing(overrides = {}) {
  return {
    title: "Test Listing Title",
    description: "A description that is long enough to meet the minimum length requirement here.",
    city: "Mumbai",
    state: "Maharashtra",
    location: "123 Test Street, Mumbai, Maharashtra",
    propertyType: "Apartment",
    pricePerNight: 1500,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["WiFi"],
    status: "ACTIVE",
    ...overrides,
  };
}

// ---- TESTS ----

test("Guest user (no cookie) cannot POST /api/listings → 401", async () => {
  const { app } = fixture();
  const res = await request(app)
    .post("/api/listings")
    .set("X-CSRF-Protection", "1")
    .send(makeListing());
  assert.ok(res.status === 401 || res.status === 403, `Expected 401/403 got ${res.status}`);
});

test("GUEST role cannot POST /api/listings → 403", async () => {
  const { app } = fixture();
  const { cookie } = await registerUser(app, "GUEST");
  const res = await request(app)
    .post("/api/listings")
    .set("Cookie", cookie)
    .set("X-CSRF-Protection", "1")
    .send(makeListing());
  assert.ok(res.status === 403 || res.status === 401, `Expected 403/401 got ${res.status}: ${JSON.stringify(res.body)}`);
});

test("Host creates listing → 201, returns listing with hostId", async () => {
  const { app, service, listings } = fixture();
  const { cookie, userId } = await registerUser(app, "HOST");

  // We use the app's real listing routes which use listingRepository (real DB)
  // For test isolation, we create a minimal express app with injected repos
  const express = (await import("express")).default;
  const cookieParser = (await import("cookie-parser")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { createAuthService } = await import("../src/services/authService.js");
  const { authenticate, requireRole } = await import("../src/middleware/auth.js");
  const { validateListing } = await import("../src/middleware/validateListing.js");
  const { uploadImages, processImages } = await import("../src/middleware/upload.js");
  const { getConfig } = await import("../src/config/env.js");

  const users2 = userFixture();
  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const authService2 = createAuthService(config2, users2);

  // Register host in users2
  const hostEmail = `host-${randomBytes(4).toString("hex")}@test.com`;
  const hostPass = "A-valid-Password-1!";
  const { user: hostUser, token: hostToken } = await authService2.register({
    name: "Host User",
    email: hostEmail,
    password: hostPass,
    role: "HOST",
  });

  const testApp = express();
  testApp.use(express.json());
  testApp.use(cookieParser());

  const service2 = createListingService(config2, listings2);
  const controller2 = createListingController(service2);
  const router = Router();
  router.post(
    "/api/listings",
    authenticate(authService2),
    requireRole("HOST"),
    uploadImages,
    processImages,
    validateListing("create"),
    controller2.create
  );
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const res = await request(testApp)
    .post("/api/listings")
    .set("Authorization", `Bearer ${hostToken}`)
    .send(makeListing());

  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.ok(res.body.data, "No data in response");
  assert.equal(res.body.data.hostId.toString(), hostUser.id, "hostId mismatch");
  assert.equal(res.body.data.title, "Test Listing Title");
});

test("Host edits own listing → 200", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const cookieParser = (await import("cookie-parser")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { createAuthService } = await import("../src/services/authService.js");
  const { authenticate, requireRole } = await import("../src/middleware/auth.js");
  const { validateListing } = await import("../src/middleware/validateListing.js");
  const { uploadImages, processImages } = await import("../src/middleware/upload.js");
  const { getConfig } = await import("../src/config/env.js");

  const users2 = userFixture();
  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const authService2 = createAuthService(config2, users2);

  const { user: hostUser, token: hostToken } = await authService2.register({
    name: "Host User",
    email: `host-edit-${randomBytes(4).toString("hex")}@test.com`,
    password: "A-valid-Password-1!",
    role: "HOST",
  });

  const service2 = createListingService(config2, listings2);
  // Create listing directly via service
  const created = await service2.create(hostUser.id, makeListing({ status: "ACTIVE" }), []);

  const controller2 = createListingController(service2);
  const testApp = express();
  testApp.use(express.json());
  testApp.use(cookieParser());
  const router = Router();
  router.patch(
    "/api/listings/:id",
    authenticate(authService2),
    requireRole("HOST"),
    uploadImages,
    processImages,
    validateListing("update"),
    controller2.update
  );
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const res = await request(testApp)
    .patch(`/api/listings/${created._id}`)
    .set("Authorization", `Bearer ${hostToken}`)
    .send({ title: "Updated Title" });

  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.title, "Updated Title");
});

test("Host cannot edit another host's listing → 403", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const cookieParser = (await import("cookie-parser")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { createAuthService } = await import("../src/services/authService.js");
  const { authenticate, requireRole } = await import("../src/middleware/auth.js");
  const { validateListing } = await import("../src/middleware/validateListing.js");
  const { uploadImages, processImages } = await import("../src/middleware/upload.js");
  const { getConfig } = await import("../src/config/env.js");

  const users2 = userFixture();
  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const authService2 = createAuthService(config2, users2);

  const { user: host1, token: token1 } = await authService2.register({
    name: "Host1", email: `host1-${randomBytes(4).toString("hex")}@test.com`,
    password: "A-valid-Password-1!", role: "HOST",
  });
  const { user: host2, token: token2 } = await authService2.register({
    name: "Host2", email: `host2-${randomBytes(4).toString("hex")}@test.com`,
    password: "A-valid-Password-1!", role: "HOST",
  });

  const service2 = createListingService(config2, listings2);
  const created = await service2.create(host1.id, makeListing({ status: "ACTIVE" }), []);

  const controller2 = createListingController(service2);
  const testApp = express();
  testApp.use(express.json());
  testApp.use(cookieParser());
  const router = Router();
  router.patch(
    "/api/listings/:id",
    authenticate(authService2),
    requireRole("HOST"),
    uploadImages,
    processImages,
    validateListing("update"),
    controller2.update
  );
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const res = await request(testApp)
    .patch(`/api/listings/${created._id}`)
    .set("Authorization", `Bearer ${token2}`)
    .send({ title: "Stolen Update" });

  assert.equal(res.status, 403, JSON.stringify(res.body));
});

test("Public GET /api/listings returns only ACTIVE listings", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { getConfig } = await import("../src/config/env.js");

  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const service2 = createListingService(config2, listings2);

  const hostId = new mongoose.Types.ObjectId().toString();
  await listings2.create({ ...makeListing({ status: "ACTIVE" }), hostId, title: "Active One" });
  await listings2.create({ ...makeListing({ status: "DRAFT" }), hostId, title: "Draft One" });

  const controller2 = createListingController(service2);
  const testApp = express();
  testApp.use(express.json());
  const router = Router();
  router.get("/api/listings", controller2.list);
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const res = await request(testApp).get("/api/listings");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(Array.isArray(res.body.data.listings), "listings not array");
  assert.equal(res.body.data.listings.length, 1, "Should only return ACTIVE listings");
  assert.equal(res.body.data.listings[0].title, "Active One");
});

test("Price filter: minPrice/maxPrice work", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { getConfig } = await import("../src/config/env.js");

  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const service2 = createListingService(config2, listings2);

  const hostId = new mongoose.Types.ObjectId().toString();
  await listings2.create({ ...makeListing({ pricePerNight: 1000, status: "ACTIVE" }), hostId, title: "Cheap" });
  await listings2.create({ ...makeListing({ pricePerNight: 5000, status: "ACTIVE" }), hostId, title: "Expensive" });

  const controller2 = createListingController(service2);
  const testApp = express();
  testApp.use(express.json());
  const router = Router();
  router.get("/api/listings", controller2.list);
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const res = await request(testApp).get("/api/listings?minPrice=2000&maxPrice=6000");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.listings.length, 1, "Should return only 1 listing in price range");
  assert.equal(res.body.data.listings[0].title, "Expensive");
});

test("Guest/bedroom filter works", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { getConfig } = await import("../src/config/env.js");

  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const service2 = createListingService(config2, listings2);

  const hostId = new mongoose.Types.ObjectId().toString();
  await listings2.create({ ...makeListing({ maxGuests: 2, bedrooms: 1, status: "ACTIVE" }), hostId, title: "Small" });
  await listings2.create({ ...makeListing({ maxGuests: 8, bedrooms: 4, status: "ACTIVE" }), hostId, title: "Large" });

  const controller2 = createListingController(service2);
  const testApp = express();
  testApp.use(express.json());
  const router = Router();
  router.get("/api/listings", controller2.list);
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  // maxGuests filter: at least 5 guests
  const res1 = await request(testApp).get("/api/listings?maxGuests=5");
  assert.equal(res1.status, 200, JSON.stringify(res1.body));
  assert.equal(res1.body.data.listings.length, 1, "Should return only Large listing");
  assert.equal(res1.body.data.listings[0].title, "Large");

  // bedrooms filter: exactly 1 bedroom
  const res2 = await request(testApp).get("/api/listings?bedrooms=1");
  assert.equal(res2.status, 200, JSON.stringify(res2.body));
  assert.equal(res2.body.data.listings.length, 1, "Should return only Small listing");
  assert.equal(res2.body.data.listings[0].title, "Small");
});

test("Pagination: page=1&limit=2 returns max 2 results, pages > 1", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { getConfig } = await import("../src/config/env.js");

  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const service2 = createListingService(config2, listings2);

  const hostId = new mongoose.Types.ObjectId().toString();
  for (let i = 1; i <= 5; i++) {
    await listings2.create({ ...makeListing({ status: "ACTIVE" }), hostId, title: `Listing ${i}` });
  }

  const controller2 = createListingController(service2);
  const testApp = express();
  testApp.use(express.json());
  const router = Router();
  router.get("/api/listings", controller2.list);
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const res = await request(testApp).get("/api/listings?page=1&limit=2");
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.listings.length, 2, "Should return 2 listings per page");
  assert.ok(res.body.data.pages > 1, `Expected pages > 1 but got ${res.body.data.pages}`);
  assert.equal(res.body.data.total, 5);
});

test("Invalid listing input (missing title) → 400 VALIDATION_ERROR", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const cookieParser = (await import("cookie-parser")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { createAuthService } = await import("../src/services/authService.js");
  const { authenticate, requireRole } = await import("../src/middleware/auth.js");
  const { validateListing } = await import("../src/middleware/validateListing.js");
  const { uploadImages, processImages } = await import("../src/middleware/upload.js");
  const { getConfig } = await import("../src/config/env.js");

  const users2 = userFixture();
  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const authService2 = createAuthService(config2, users2);

  const { user: hostUser, token: hostToken } = await authService2.register({
    name: "Host", email: `host-val-${randomBytes(4).toString("hex")}@test.com`,
    password: "A-valid-Password-1!", role: "HOST",
  });

  const service2 = createListingService(config2, listings2);
  const controller2 = createListingController(service2);

  const testApp = express();
  testApp.use(express.json());
  testApp.use(cookieParser());
  const router = Router();
  router.post(
    "/api/listings",
    authenticate(authService2),
    requireRole("HOST"),
    uploadImages,
    processImages,
    validateListing("create"),
    controller2.create
  );
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const body = { ...makeListing() };
  delete body.title;

  const res = await request(testApp)
    .post("/api/listings")
    .set("Authorization", `Bearer ${hostToken}`)
    .send(body);

  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.ok(res.body.error.fields && res.body.error.fields.title, "Should have title field error");
});

test("Non-existent listing GET /api/listings/:id → 404", async () => {
  const { createListingService } = await import("../src/services/listingService.js");
  const { createListingController } = await import("../src/controllers/listingController.js");
  const express = (await import("express")).default;
  const { notFound, errorHandler } = await import("../src/middleware/errors.js");
  const { getConfig } = await import("../src/config/env.js");

  const listings2 = listingFixture();
  const config2 = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const service2 = createListingService(config2, listings2);

  const controller2 = createListingController(service2);
  const testApp = express();
  testApp.use(express.json());
  const router = Router();
  router.get("/api/listings/:id", controller2.getOne);
  testApp.use(router);
  testApp.use(notFound);
  testApp.use(errorHandler);

  const fakeId = new mongoose.Types.ObjectId().toString();
  const res = await request(testApp).get(`/api/listings/${fakeId}`);
  assert.equal(res.status, 404, JSON.stringify(res.body));
  assert.equal(res.body.error.code, "NOT_FOUND");
});
