import { properties, amenities, types, dateAfter } from "../data/properties.js";
import { API_BASE_URL, apiRequest } from "./apiClient.js";
import { normalizeListing } from "./listingApiService.js";
export const config = { apiBaseUrl: API_BASE_URL, mockListings: true };
let memory;
const key = "staysphere-v1";
export function read() {
  if (memory) return memory;
  try {
    memory = JSON.parse(localStorage.getItem(key));
    if (memory && ("accounts" in memory || "user" in memory)) {
      delete memory.accounts;
      delete memory.user;
      localStorage.setItem(key, JSON.stringify(memory));
    }
  } catch {
    console.warn(
      "Unable to restore local demo property data; using a fresh local state.",
    );
    memory = null;
  }
  return (memory ||= {
    listings: structuredClone(properties),
    favorites: [],
    recent: [],
  });
}
export function write(fn) {
  const state = structuredClone(read());
  fn(state);
  delete state.accounts;
  delete state.user;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    throw Error("Demo storage is full. Remove large images and try again.");
  }
  memory = state;
  return state;
}
export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const ok = (data) => Promise.resolve({ data });
export const listingService = {
  list: () => ok(read().listings),
  save: (p) => {
    write((s) => {
      const i = s.listings.findIndex((x) => x.id === p.id);
      i < 0 ? s.listings.unshift(p) : s.listings.splice(i, 1, p);
    });
    return ok(p);
  },
  remove: (id) => {
    write((s) => (s.listings = s.listings.filter((p) => p.id !== id)));
    return ok(id);
  },
};
export const favoriteService = {
  toggle: (id) => {
    write(
      (s) =>
        (s.favorites = s.favorites.includes(id)
          ? s.favorites.filter((x) => x !== id)
          : [...s.favorites, id]),
    );
    return ok(read().favorites);
  },
};
export function filterListings(items, f = {}) {
  return items
    .filter(
      (p) =>
        p.status === "active" &&
        (!f.q ||
          `${p.name} ${p.location}`
            .toLowerCase()
            .includes(f.q.toLowerCase())) &&
        (!f.min || p.price >= +f.min) &&
        (!f.max || p.price <= +f.max) &&
        (!f.guests || p.guests >= +f.guests) &&
        (!f.bedrooms || p.bedrooms >= +f.bedrooms) &&
        (!f.type || p.type === f.type) &&
        (!f.amenities || f.amenities.every((a) => p.amenities.includes(a))),
    )
    .sort((a, b) =>
      f.sort === "low"
        ? a.price - b.price
        : f.sort === "high"
          ? b.price - a.price
          : b.createdAt - a.createdAt,
    );
}
export { authService } from "./authService.js";
export const availabilityService = {
  add(propertyId, range) {
    const p = read().listings.find((x) => x.id === propertyId);
    if (!range.start || !range.end || range.start >= range.end)
      throw Error("End date must be after start date.");
    if (range.start < dateAfter(0))
      throw Error("Choose today or a future date.");
    if (p.blocks.some((b) => range.start < b.end && range.end > b.start))
      throw Error("This range overlaps an existing block.");
    write((s) =>
      s.listings
        .find((x) => x.id === propertyId)
        .blocks.push({ ...range, id: crypto.randomUUID() }),
    );
    return ok(p);
  },
  remove(id, blockId) {
    write(
      (s) =>
        (s.listings.find((p) => p.id === id).blocks = s.listings
          .find((p) => p.id === id)
          .blocks.filter((b) => b.id !== blockId)),
    );
    return ok(id);
  },
};
export const aiService = {
  async findPropertiesFromPrompt(prompt) {
    if (!prompt || !prompt.trim()) {
      throw Error("Try including a destination, budget, property type, or amenity.");
    }

    try {
      const res = await apiRequest("/ai/search", {
        method: "POST",
        body: { prompt: prompt.trim() },
      });
      if (res?.data) {
        const rawListings = res.data.listings || [];
        const normalized = rawListings.map(normalizeListing);
        return {
          data: {
            filters: res.data.filters || {},
            properties: normalized,
            explanation: res.data.explanation,
            provider: res.data.provider,
          },
        };
      }
    } catch (err) {
      console.warn("Backend AI search failed, using local search fallback:", err.message);
    }

    // Local fallback
    await delay(300);
    const s = prompt.toLowerCase(),
      f = { amenities: [] };
    for (const loc of [
      "Goa",
      "Manali",
      "Jaipur",
      "Lonavala",
      "Darjeeling",
      "Bengaluru",
      "Mumbai",
      "Delhi",
      "Udaipur",
    ])
      if (s.includes(loc.toLowerCase())) f.q = loc;
    for (const t of types) if (s.includes(t.toLowerCase())) f.type = t;
    const budget = s.match(
      /(?:under|below|budget|max|less than)\s*(?:₹|rs\.?\s*)?([\d,]+)/
    );
    if (budget) f.max = Number(budget[1].replaceAll(",", ""));
    const guests = s.match(/(?:for\s+)?(\d+)\s*(?:guests|people|persons)/);
    if (guests) f.guests = +guests[1];
    for (const a of amenities)
      if (
        s.includes(a.toLowerCase()) ||
        (a === "Wi-Fi" && /wifi|wi fi/.test(s)) ||
        (a === "Swimming pool" && s.includes("pool"))
      )
        f.amenities.push(a);
    if (!f.q && !f.type && !f.max && !f.guests && !f.amenities.length)
      throw Error(
        "Try including a destination, budget, property type, or amenity."
      );
    return {
      data: { filters: f, properties: filterListings(read().listings, f) },
    };
  },

  async generateListingDescription(p) {
    if (!p.name && !p.title)
      throw Error("Add a property title and location first.");

    try {
      const res = await apiRequest("/ai/description", {
        method: "POST",
        body: {
          title: p.title || p.name,
          location: p.location || [p.city, p.state].filter(Boolean).join(", "),
          propertyType: p.propertyType || p.type,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          maxGuests: p.maxGuests || p.guests,
          pricePerNight: p.pricePerNight || p.price,
          amenities: p.amenities,
          highlights: p.highlights,
        },
      });
      if (res?.data?.description) {
        return { data: res.data.description };
      }
    } catch (err) {
      console.warn("Backend AI description failed, using template:", err.message);
    }

    await delay(300);
    return ok(
      `Welcome to ${p.name || p.title}, a ${String(p.type || p.propertyType || "villa").toLowerCase()} in ${p.location}. With ${p.bedrooms} bedrooms, ${p.bathrooms} bathrooms, and space for ${p.guests || p.maxGuests} guests, it is a comfortable setting for your next escape.${p.amenities?.length ? " Amenities include " + p.amenities.join(", ") + "." : ""}${p.highlights ? " " + p.highlights : ""} Available from ₹${Number(p.price || p.pricePerNight || 5000).toLocaleString("en-IN")} per night.`
    );
  },
};
