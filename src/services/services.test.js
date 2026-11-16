import { test } from "node:test";
import assert from "node:assert/strict";
import {
  read,
  write,
  filterListings,
  authService,
  listingService,
  favoriteService,
  aiService,
  availabilityService,
} from "./index.js";
import { dateAfter } from "../data/properties.js";
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
test("guest and host demo authentication reject wrong credentials and retain role", async () => {
  await assert.rejects(authService.login("host@staysphere.demo", "bad"));
  assert.equal(
    (await authService.login("host@staysphere.demo", "Demo123!")).data.role,
    "HOST",
  );
  assert.equal(
    (await authService.login("guest@staysphere.demo", "Demo123!")).data.role,
    "GUEST",
  );
  await authService.logout();
  assert.equal(read().user, null);
});
test("filters combine budget, location, guests, type and amenities", () => {
  const results = filterListings(read().listings, {
    q: "Goa",
    max: 6000,
    guests: 5,
    type: "Villa",
    amenities: ["Swimming pool"],
  });
  assert.deepEqual(
    results.map((p) => p.id),
    ["stay-1", "stay-7"],
  );
  assert.equal(filterListings(read().listings, { max: 1 }).length, 0);
});
test("AI returns only matching centralized properties and clarifies unknown input", async () => {
  const { data } = await aiService.findPropertiesFromPrompt(
    "A villa in Goa under ₹6,000 for 5 people with a pool",
  );
  assert.equal(data.filters.max, 6000);
  assert.equal(data.properties.length, 2);
  assert.ok(
    data.properties.every(
      (p) =>
        p.price <= 6000 &&
        p.location.includes("Goa") &&
        p.guests >= 5 &&
        p.amenities.includes("Swimming pool"),
    ),
  );
  await assert.rejects(
    aiService.findPropertiesFromPrompt("something wonderful"),
  );
});
test("AI description uses facts and does not add unprovided amenities", async () => {
  const { data } = await aiService.generateListingDescription({
    name: "Small Cabin",
    location: "Manali",
    type: "Cabin",
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    price: 2000,
    amenities: ["Wi-Fi"],
  });
  assert.ok(data.includes("Small Cabin"));
  assert.ok(data.includes("Wi-Fi"));
  assert.ok(!data.includes("pool"));
});
test("favorite toggle is reversible", async () => {
  await favoriteService.toggle("stay-1");
  assert.ok(read().favorites.includes("stay-1"));
  await favoriteService.toggle("stay-1");
  assert.ok(!read().favorites.includes("stay-1"));
});
test("listing create, edit and delete use the shared state", async () => {
  await listingService.save({
    ...read().listings[0],
    id: "test-listing",
    name: "New space",
    status: "draft",
  });
  assert.ok(read().listings.find((p) => p.id === "test-listing"));
  assert.ok(
    !filterListings(read().listings).some((p) => p.id === "test-listing"),
  );
  await listingService.save({
    ...read().listings.find((p) => p.id === "test-listing"),
    name: "Edited space",
    status: "active",
  });
  assert.equal(
    read().listings.find((p) => p.id === "test-listing").name,
    "Edited space",
  );
  await listingService.remove("test-listing");
  assert.ok(!read().listings.find((p) => p.id === "test-listing"));
});
test("calendar rejects past, invalid and overlapping ranges; accepts adjacent end-exclusive ranges", async () => {
  const id = "stay-1";
  assert.throws(
    () =>
      availabilityService.add(id, {
        start: dateAfter(-1),
        end: dateAfter(1),
        reason: "Maintenance",
      }),
    /future/,
  );
  assert.throws(
    () =>
      availabilityService.add(id, {
        start: dateAfter(1),
        end: dateAfter(1),
        reason: "Maintenance",
      }),
    /after/,
  );
  assert.throws(
    () =>
      availabilityService.add(id, {
        start: dateAfter(5),
        end: dateAfter(8),
        reason: "Host Blocked",
      }),
    /overlaps/,
  );
  const before = read().listings[0].blocks.length;
  await availabilityService.add(id, {
    start: dateAfter(7),
    end: dateAfter(9),
    reason: "Maintenance",
  });
  assert.equal(read().listings[0].blocks.length, before + 1);
  const block = read().listings[0].blocks.at(-1);
  await availabilityService.remove(id, block.id);
  assert.equal(read().listings[0].blocks.length, before);
});
