import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config/env.js";

const secret = randomBytes(48).toString("hex");

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
      Object.assign(user, values, { updatedAt: new Date() });
      return user;
    },
    _records: records,
  };
}

function listingFixture() {
  const records = new Map();
  return {
    async findById(id) {
      return records.get(id) || null;
    },
    async create(data) {
      const id = new mongoose.Types.ObjectId().toString();
      const listing = {
        ...data,
        _id: id,
        status: data.status || "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, listing);
      return listing;
    },
    _records: records,
  };
}

function availabilityFixture() {
  const records = new Map();
  return {
    async findByListing(listingId) {
      return [...records.values()]
        .filter((b) => String(b.listingId) === String(listingId))
        .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    },
    async findById(blockId) {
      return records.get(blockId) || null;
    },
    async findOverlapping(listingId, startDate, endDate) {
      return (
        [...records.values()].find(
          (b) =>
            String(b.listingId) === String(listingId) &&
            b.startDate < endDate &&
            b.endDate > startDate
        ) || null
      );
    },
    async createBlockAtomic(listingId, blockData) {
      const overlap = [...records.values()].find(
        (b) =>
          String(b.listingId) === String(listingId) &&
          b.startDate < blockData.endDate &&
          b.endDate > blockData.startDate
      );
      if (overlap) return { overlap };

      const id = new mongoose.Types.ObjectId().toString();
      const doc = {
        _id: id,
        listingId,
        ...blockData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, doc);
      return { block: doc };
    },
    async remove(blockId) {
      records.delete(blockId);
      return { deletedCount: 1 };
    },
    _records: records,
  };
}

function favoriteFixture(listings) {
  const records = new Map();
  return {
    async findByUser(userId) {
      const userFavs = [...records.values()].filter(
        (f) => String(f.userId) === String(userId)
      );
      return userFavs.map((f) => {
        const listing = listings._records.get(String(f.listingId)) || null;
        return {
          ...f,
          listingId: listing,
        };
      });
    },
    async getUserFavoriteListingIds(userId) {
      return [...records.values()]
        .filter((f) => String(f.userId) === String(userId))
        .map((f) => String(f.listingId));
    },
    async findByUserAndListing(userId, listingId) {
      return (
        [...records.values()].find(
          (f) =>
            String(f.userId) === String(userId) &&
            String(f.listingId) === String(listingId)
        ) || null
      );
    },
    async add(userId, listingId) {
      const key = `${userId}:${listingId}`;
      if (records.has(key)) return records.get(key);
      const id = new mongoose.Types.ObjectId().toString();
      const doc = {
        _id: id,
        userId,
        listingId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(key, doc);
      return doc;
    },
    async remove(userId, listingId) {
      const key = `${userId}:${listingId}`;
      const deleted = records.delete(key);
      return { removed: deleted };
    },
    _records: records,
  };
}

function fixture() {
  const users = userFixture();
  const listings = listingFixture();
  const availabilityRepo = availabilityFixture();
  const favoriteRepo = favoriteFixture(listings);
  const config = getConfig({ NODE_ENV: "test", JWT_SECRET: secret });
  const app = createApp(config, {
    users,
    listings,
    availabilityRepo,
    favoriteRepo,
  });

  return { app, users, listings, availabilityRepo, favoriteRepo, config };
}

async function register(app, role) {
  const email = `${role.toLowerCase()}-${randomBytes(4).toString("hex")}@test.com`;
  const password = "ValidPassword123!";
  const res = await request(app)
    .post("/api/auth/register")
    .set("X-CSRF-Protection", "1")
    .send({ name: `User ${role}`, email, password, role });
  assert.equal(res.status, 201);
  const cookie = res.headers["set-cookie"][0].split(";")[0];
  return { cookie, userId: res.body.data.id, email };
}

// Future date helpers
function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("Public can view blocked dates and check availability", async () => {
  const { app, listings, availabilityRepo } = fixture();
  const listing = await listings.create({
    title: "Public Villa",
    pricePerNight: 2000,
    hostId: "host-1",
  });

  const start = getFutureDate(10);
  const end = getFutureDate(15);
  await availabilityRepo.createBlockAtomic(listing._id, {
    startDate: start,
    endDate: end,
    reason: "BOOKED",
  });

  // Public GET blocks
  const getRes = await request(app)
    .get(`/api/availability/${listing._id}`)
    .expect(200);
  assert.equal(getRes.body.data.length, 1);
  assert.equal(getRes.body.data[0].startDate, start);
  assert.equal(getRes.body.data[0].endDate, end);

  // Check overlapping interval (unavailable)
  const checkUnavailable = await request(app)
    .get(
      `/api/availability/${listing._id}/check?checkIn=${getFutureDate(12)}&checkOut=${getFutureDate(14)}`
    )
    .expect(200);
  assert.equal(checkUnavailable.body.data.available, false);

  // Check non-overlapping interval (available)
  const checkAvailable = await request(app)
    .get(
      `/api/availability/${listing._id}/check?checkIn=${getFutureDate(20)}&checkOut=${getFutureDate(25)}`
    )
    .expect(200);
  assert.equal(checkAvailable.body.data.available, true);
});

test("Host adds blocked date range, adjacent non-overlapping blocks accepted", async () => {
  const { app, listings } = fixture();
  const { cookie, userId: hostId } = await register(app, "HOST");

  const listing = await listings.create({
    title: "Host Mountain Cottage",
    pricePerNight: 3000,
    hostId,
  });

  const start1 = getFutureDate(5);
  const end1 = getFutureDate(10);
  // Block 1: [5, 10)
  const res1 = await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", cookie)
    .send({ start: start1, end: end1, reason: "Host Blocked" })
    .expect(201);
  assert.equal(res1.body.data.startDate, start1);
  assert.equal(res1.body.data.endDate, end1);

  // Adjacent Block 2: [10, 15) -> since intervals are [start, end), 10 is acceptable as next start!
  const start2 = getFutureDate(10);
  const end2 = getFutureDate(15);
  const res2 = await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", cookie)
    .send({ start: start2, end: end2, reason: "Maintenance" })
    .expect(201);
  assert.equal(res2.body.data.startDate, start2);
});

test("Overlapping blocks are rejected with 409", async () => {
  const { app, listings } = fixture();
  const { cookie, userId: hostId } = await register(app, "HOST");

  const listing = await listings.create({
    title: "Overlap Test Villa",
    pricePerNight: 4000,
    hostId,
  });

  const start = getFutureDate(5);
  const end = getFutureDate(10);
  await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", cookie)
    .send({ start, end, reason: "Host Blocked" })
    .expect(201);

  // Attempt overlapping block: [7, 12)
  const overlapRes = await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", cookie)
    .send({ start: getFutureDate(7), end: getFutureDate(12), reason: "Booked" })
    .expect(409);
  assert.equal(overlapRes.body.error.code, "OVERLAPPING_BLOCK");
});

test("Unauthorized host modifications rejected (403)", async () => {
  const { app, listings } = fixture();
  const { userId: host1 } = await register(app, "HOST");
  const { cookie: host2Cookie } = await register(app, "HOST");

  const listing = await listings.create({
    title: "Host 1 Villa",
    pricePerNight: 5000,
    hostId: host1,
  });

  // Host 2 attempts to block dates for Host 1's listing
  await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", host2Cookie)
    .send({
      start: getFutureDate(5),
      end: getFutureDate(10),
      reason: "Host Blocked",
    })
    .expect(403);
});

test("Host-owned block deletion succeeds", async () => {
  const { app, listings } = fixture();
  const { cookie, userId: hostId } = await register(app, "HOST");

  const listing = await listings.create({
    title: "Deletable Block Cottage",
    pricePerNight: 2500,
    hostId,
  });

  const createRes = await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", cookie)
    .send({
      start: getFutureDate(5),
      end: getFutureDate(10),
      reason: "Host Blocked",
    })
    .expect(201);

  const blockId = createRes.body.data.id;

  // Delete block
  await request(app)
    .delete(`/api/availability/blocks/${blockId}`)
    .set("Cookie", cookie)
    .expect(200);

  // Verify it is gone
  const getRes = await request(app)
    .get(`/api/availability/${listing._id}`)
    .expect(200);
  assert.equal(getRes.body.data.length, 0);
});

test("Past dates and invalid date order are rejected with 400", async () => {
  const { app, listings } = fixture();
  const { cookie, userId: hostId } = await register(app, "HOST");

  const listing = await listings.create({
    title: "Date Validation Apartment",
    pricePerNight: 1800,
    hostId,
  });

  // Past date
  await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", cookie)
    .send({ start: "2020-01-01", end: "2020-01-05" })
    .expect(400);

  // startDate >= endDate
  await request(app)
    .post(`/api/availability/${listing._id}/blocks`)
    .set("Cookie", cookie)
    .send({ start: getFutureDate(10), end: getFutureDate(5) })
    .expect(400);
});

test("Favorites: guest can add, list, toggle, delete and avoid duplicate favorites", async () => {
  const { app, listings } = fixture();
  const { cookie, userId } = await register(app, "GUEST");

  const listing1 = await listings.create({
    title: "Favorite Beach House",
    city: "Goa",
    pricePerNight: 7000,
    status: "ACTIVE",
    hostId: "host-1",
  });

  const listing2 = await listings.create({
    title: "Favorite Mountain Haven",
    city: "Manali",
    pricePerNight: 4000,
    status: "ACTIVE",
    hostId: "host-1",
  });

  // Unauthenticated cannot access favorites
  await request(app).get("/api/favorites").expect(401);

  // Add favorite
  const addRes = await request(app)
    .post(`/api/favorites/${listing1._id}`)
    .set("Cookie", cookie)
    .expect(201);
  assert.equal(addRes.body.data.favorited, true);

  // Adding same favorite again is idempotent and doesn't duplicate
  await request(app)
    .post(`/api/favorites/${listing1._id}`)
    .set("Cookie", cookie)
    .expect(201);

  // List favorites populated with listing details
  const listRes = await request(app)
    .get("/api/favorites")
    .set("Cookie", cookie)
    .expect(200);
  assert.equal(listRes.body.data.favorites.length, 1);
  assert.equal(listRes.body.data.favorites[0].listing.title, "Favorite Beach House");
  assert.deepEqual(listRes.body.data.listingIds, [listing1._id]);

  // Toggle favorite for listing2 (adds)
  const toggleRes = await request(app)
    .put(`/api/favorites/${listing2._id}`)
    .set("Cookie", cookie)
    .expect(200);
  assert.equal(toggleRes.body.data.favorited, true);
  assert.equal(toggleRes.body.data.listingIds.length, 2);

  // Toggle favorite for listing2 again (removes)
  const untoggleRes = await request(app)
    .put(`/api/favorites/${listing2._id}`)
    .set("Cookie", cookie)
    .expect(200);
  assert.equal(untoggleRes.body.data.favorited, false);
  assert.equal(untoggleRes.body.data.listingIds.length, 1);

  // Remove favorite directly
  await request(app)
    .delete(`/api/favorites/${listing1._id}`)
    .set("Cookie", cookie)
    .expect(200);

  const emptyList = await request(app)
    .get("/api/favorites")
    .set("Cookie", cookie)
    .expect(200);
  assert.equal(emptyList.body.data.favorites.length, 0);
});
