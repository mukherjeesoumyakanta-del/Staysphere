import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config/env.js";

const secret = randomBytes(48).toString("hex");

function fixture() {
  const userRecords = new Map();
  const listingRecords = new Map();
  const bookingRecords = new Map();
  const nightsClaimed = new Set(); // Key: `${listingId}:${date}` for atomic mock

  const users = {
    findByEmail: async (email) =>
      [...userRecords.values()].find((u) => u.email === email) || null,
    findById: async (id) => userRecords.get(id) || null,
    create: async (input) => {
      const user = {
        ...input,
        _id: new mongoose.Types.ObjectId().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      userRecords.set(user._id, user);
      return user;
    },
    updateProfile: async (id, values) => {
      const user = userRecords.get(id);
      if (!user) return null;
      Object.assign(user, values, { updatedAt: new Date() });
      return user;
    },
    _records: userRecords,
  };

  const listings = {
    findById: async (id) => listingRecords.get(String(id)) || null,
    create: async (data) => {
      const id = new mongoose.Types.ObjectId().toString();
      const listing = {
        ...data,
        _id: id,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      listingRecords.set(id, listing);
      return listing;
    },
    update: async (id, data) => {
      const item = listingRecords.get(String(id));
      if (!item) return null;
      Object.assign(item, data, { updatedAt: new Date() });
      return item;
    },
    search: async () => ({
      listings: [...listingRecords.values()],
      total: listingRecords.size,
    }),
    findByHost: async (hostId) =>
      [...listingRecords.values()].filter(
        (l) => String(l.hostId) === String(hostId)
      ),
    _records: listingRecords,
  };

  const bookingRepo = {
    async createAtomic(data) {
      const { listingId, checkIn, checkOut } = data;
      const nights = [];
      const curr = new Date(checkIn + "T12:00:00Z");
      const end = new Date(checkOut + "T12:00:00Z");
      while (curr < end) {
        nights.push(curr.toISOString().split("T")[0]);
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      // Atomic lock simulation: check each night key
      for (const n of nights) {
        const key = `${listingId}:${n}`;
        if (nightsClaimed.has(key)) {
          return { overlap: true, reason: "BOOKED" };
        }
      }

      // Claim all nights
      for (const n of nights) {
        nightsClaimed.add(`${listingId}:${n}`);
      }

      const id = new mongoose.Types.ObjectId().toString();
      const listing = listingRecords.get(String(listingId));
      const booking = {
        _id: id,
        id,
        ...data,
        listingId: listing || data.listingId,
        totalNights: nights.length,
        status: "CONFIRMED",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      bookingRecords.set(id, booking);
      return { booking };
    },

    async findByGuest(guestId) {
      return [...bookingRecords.values()].filter(
        (b) => String(b.guestId) === String(guestId)
      );
    },

    async findByHost(hostId) {
      return [...bookingRecords.values()].filter(
        (b) => String(b.hostId) === String(hostId)
      );
    },

    async findById(id) {
      return bookingRecords.get(String(id)) || null;
    },

    async findConfirmedByListing(listingId) {
      return [...bookingRecords.values()].filter(
        (b) =>
          String(b.listingId?._id || b.listingId) === String(listingId) &&
          b.status === "CONFIRMED"
      );
    },

    async cancel(id) {
      const b = bookingRecords.get(String(id));
      if (!b) return null;
      b.status = "CANCELLED";
      b.updatedAt = new Date();

      // Release nights
      const curr = new Date(b.checkIn + "T12:00:00Z");
      const end = new Date(b.checkOut + "T12:00:00Z");
      while (curr < end) {
        nightsClaimed.delete(
          `${b.listingId?._id || b.listingId}:${curr.toISOString().split("T")[0]}`
        );
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
      return b;
    },
    _records: bookingRecords,
  };

  const availabilityRepo = {
    findByListing: async () => [],
    findOverlapping: async () => false,
  };

  const config = getConfig({
    JWT_SECRET: secret,
    NODE_ENV: "test",
    CLIENT_URL: "http://localhost:5173",
  });

  const app = createApp(config, {
    users,
    listings,
    bookingRepo,
    availabilityRepo,
  });

  return { app, users, listings, bookingRepo };
}

async function registerUser(app, role = "GUEST") {
  const email = `${role.toLowerCase()}-${randomBytes(4).toString("hex")}@example.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .set("X-CSRF-Protection", "1")
    .send({ name: `Test ${role}`, email, password: "Password123!", role });
  const cookie = res.headers["set-cookie"][0].split(";")[0];
  return { cookie, userId: res.body.data.id, email };
}

test("GUEST creates booking for active listing → 201 Created with server-calculated price and nights", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");
  const guest = await registerUser(app, "GUEST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "Seaside Villa",
    description: "A lovely villa by the Arabian Sea.",
    city: "Goa",
    state: "Goa",
    location: "Goa, India",
    propertyType: "Villa",
    pricePerNight: 5000,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["WiFi", "Pool"],
    status: "ACTIVE",
  });

  const res = await request(app)
    .post("/api/bookings")
    .set("Cookie", guest.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-10",
      checkOut: "2026-12-13",
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.totalNights, 3);
  assert.equal(res.body.data.totalPrice, 15000); // 3 * 5000
  assert.equal(res.body.data.status, "CONFIRMED");
  assert.equal(res.body.data.checkIn, "2026-12-10");
  assert.equal(res.body.data.checkOut, "2026-12-13");
});

test("Unauthenticated user cannot book → 401", async () => {
  const { app, listings } = fixture();
  const listing = await listings.create({
    hostId: new mongoose.Types.ObjectId().toString(),
    title: "Test Property",
    pricePerNight: 2000,
    status: "ACTIVE",
  });

  const res = await request(app)
    .post("/api/bookings")
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-10",
      checkOut: "2026-12-13",
    });

  assert.equal(res.status, 401);
});

test("Host cannot book their own property → 403 Forbidden", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "Host Own Villa",
    pricePerNight: 5000,
    status: "ACTIVE",
  });

  const res = await request(app)
    .post("/api/bookings")
    .set("Cookie", host.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-10",
      checkOut: "2026-12-13",
    });

  assert.equal(res.status, 403);
});

test("Overlapping dates are rejected with 409 Conflict", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");
  const guest1 = await registerUser(app, "GUEST");
  const guest2 = await registerUser(app, "GUEST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "Popular Villa",
    pricePerNight: 4000,
    status: "ACTIVE",
  });

  // Guest 1 books Dec 10 to Dec 15
  const res1 = await request(app)
    .post("/api/bookings")
    .set("Cookie", guest1.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-10",
      checkOut: "2026-12-15",
    });
  assert.equal(res1.status, 201);

  // Guest 2 tries booking Dec 12 to Dec 14 (overlap)
  const res2 = await request(app)
    .post("/api/bookings")
    .set("Cookie", guest2.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-12",
      checkOut: "2026-12-14",
    });
  assert.equal(res2.status, 409);
  assert.equal(res2.body.error.code, "DATES_UNAVAILABLE");
});

test("Adjacent non-overlapping booking succeeds (checkIn on another's checkOut date)", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");
  const guest1 = await registerUser(app, "GUEST");
  const guest2 = await registerUser(app, "GUEST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "Turnover Villa",
    pricePerNight: 4000,
    status: "ACTIVE",
  });

  // Guest 1: Dec 10 to Dec 13
  const res1 = await request(app)
    .post("/api/bookings")
    .set("Cookie", guest1.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-10",
      checkOut: "2026-12-13",
    });
  assert.equal(res1.status, 201);

  // Guest 2: Dec 13 to Dec 16 (Dec 13 is checkout for Guest 1, valid [checkIn, checkOut) interval)
  const res2 = await request(app)
    .post("/api/bookings")
    .set("Cookie", guest2.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-13",
      checkOut: "2026-12-16",
    });
  assert.equal(res2.status, 201);
});

test("GET /api/bookings/my returns guest bookings, GET /api/bookings/host returns host reservations", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");
  const guest = await registerUser(app, "GUEST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "My Booking Property",
    pricePerNight: 3000,
    status: "ACTIVE",
  });

  await request(app)
    .post("/api/bookings")
    .set("Cookie", guest.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-20",
      checkOut: "2026-12-22",
    });

  // Guest views their bookings
  const guestRes = await request(app)
    .get("/api/bookings/my")
    .set("Cookie", guest.cookie);
  assert.equal(guestRes.status, 200);
  assert.equal(guestRes.body.data.length, 1);
  assert.equal(guestRes.body.data[0].totalNights, 2);

  // Host views reservations for their properties
  const hostRes = await request(app)
    .get("/api/bookings/host")
    .set("Cookie", host.cookie);
  assert.equal(hostRes.status, 200);
  assert.equal(hostRes.body.data.length, 1);
  assert.equal(hostRes.body.data[0].totalPrice, 6000);
});

test("Guest cancels booking → status CANCELLED and dates become available again", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");
  const guest1 = await registerUser(app, "GUEST");
  const guest2 = await registerUser(app, "GUEST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "Cancellable Villa",
    pricePerNight: 3500,
    status: "ACTIVE",
  });

  const bookRes = await request(app)
    .post("/api/bookings")
    .set("Cookie", guest1.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-25",
      checkOut: "2026-12-28",
    });
  assert.equal(bookRes.status, 201);
  const bookingId = bookRes.body.data.id;

  // Cancel booking
  const cancelRes = await request(app)
    .patch(`/api/bookings/${bookingId}/cancel`)
    .set("Cookie", guest1.cookie)
    .set("X-CSRF-Protection", "1");
  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.data.status, "CANCELLED");

  // Re-cancelling rejected with 400
  const reCancelRes = await request(app)
    .patch(`/api/bookings/${bookingId}/cancel`)
    .set("Cookie", guest1.cookie)
    .set("X-CSRF-Protection", "1");
  assert.equal(reCancelRes.status, 400);

  // Guest 2 can now book the freed dates
  const newBookRes = await request(app)
    .post("/api/bookings")
    .set("Cookie", guest2.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-25",
      checkOut: "2026-12-28",
    });
  assert.equal(newBookRes.status, 201);
});

test("Public availability endpoint includes confirmed bookings as unavailable", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");
  const guest = await registerUser(app, "GUEST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "Calendar Property",
    pricePerNight: 3000,
    status: "ACTIVE",
  });

  await request(app)
    .post("/api/bookings")
    .set("Cookie", guest.cookie)
    .set("X-CSRF-Protection", "1")
    .send({
      listingId: listing.id,
      checkIn: "2026-12-10",
      checkOut: "2026-12-14",
    });

  const availRes = await request(app).get(`/api/availability/${listing.id}`);
  assert.equal(availRes.status, 200);
  assert.ok(availRes.body.data.length >= 1);
  const bookedRange = availRes.body.data.find((b) => b.reason === "BOOKED");
  assert.ok(bookedRange, "Booked range should be present in availability data");
  assert.equal(bookedRange.startDate, "2026-12-10");
  assert.equal(bookedRange.endDate, "2026-12-14");
});

test("Concurrent overlapping booking requests: exactly one succeeds and one is rejected with 409", async () => {
  const { app, listings } = fixture();
  const host = await registerUser(app, "HOST");
  const guest1 = await registerUser(app, "GUEST");
  const guest2 = await registerUser(app, "GUEST");

  const listing = await listings.create({
    hostId: host.userId,
    title: "Race Condition Villa",
    pricePerNight: 5000,
    status: "ACTIVE",
  });

  // Launch two concurrent requests for overlapping dates
  const [res1, res2] = await Promise.all([
    request(app)
      .post("/api/bookings")
      .set("Cookie", guest1.cookie)
      .set("X-CSRF-Protection", "1")
      .send({
        listingId: listing.id,
        checkIn: "2026-12-15",
        checkOut: "2026-12-18",
      }),
    request(app)
      .post("/api/bookings")
      .set("Cookie", guest2.cookie)
      .set("X-CSRF-Protection", "1")
      .send({
        listingId: listing.id,
        checkIn: "2026-12-16",
        checkOut: "2026-12-19",
      }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(
    statuses,
    [201, 409],
    `Expected [201, 409], got ${JSON.stringify(statuses)}`
  );
});
