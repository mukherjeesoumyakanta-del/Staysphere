import { properties, amenities, types, dateAfter } from "../data/properties.js";
export const config = {
  apiBaseUrl: import.meta.env?.VITE_API_BASE_URL || "/api",
  mock: true,
};
let memory;
const key = "staysphere-v1";
export function read() {
  if (memory) return memory;
  try {
    memory = JSON.parse(localStorage.getItem(key));
  } catch {}
  return (memory ||= {
    listings: structuredClone(properties),
    favorites: [],
    recent: [],
    user: null,
    accounts: [],
  });
}
export function write(fn) {
  const state = structuredClone(read());
  fn(state);
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
export const authService = {
  async login(email, password) {
    await delay();
    const account = read().accounts.find(
      (a) => a.email === email && a.password === password,
    );
    if (
      !account &&
      !(
        ["guest@staysphere.demo", "host@staysphere.demo"].includes(email) &&
        password === "Demo123!"
      )
    )
      throw Error("Check your demo email and password.");
    const user = account
      ? { id: account.id, name: account.name, email, role: account.role }
      : {
          id: email.startsWith("host") ? "host-demo" : "guest-demo",
          name: email.startsWith("host") ? "Arjun" : "Ananya",
          email,
          role: email.startsWith("host") ? "HOST" : "GUEST",
        };
    write((s) => (s.user = user));
    return { data: user };
  },
  async signup(values) {
    await delay();
    if (
      read().accounts.some((x) => x.email === values.email) ||
      ["guest@staysphere.demo", "host@staysphere.demo"].includes(values.email)
    )
      throw Error("An account with this email already exists.");
    const a = { ...values, id: crypto.randomUUID() };
    write((s) => {
      s.accounts.push(a);
      s.user = { id: a.id, name: a.name, email: a.email, role: a.role };
    });
    return ok(read().user);
  },
  logout() {
    write((s) => (s.user = null));
    return ok(null);
  },
  update: (values) => {
    write((s) => (s.user = { ...s.user, ...values }));
    return ok(read().user);
  },
};
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
    await delay(850);
    const s = prompt.toLowerCase(),
      f = { amenities: [] };
    for (const loc of [
      "Goa",
      "Manali",
      "Jaipur",
      "Lonavala",
      "Darjeeling",
      "Bengaluru",
    ])
      if (s.includes(loc.toLowerCase())) f.q = loc;
    for (const t of types) if (s.includes(t.toLowerCase())) f.type = t;
    const budget = s.match(
      /(?:under|below|budget|max|less than)\s*(?:₹|rs\.?\s*)?([\d,]+)/,
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
        "Try including a destination, budget, property type, or amenity.",
      );
    return {
      data: { filters: f, properties: filterListings(read().listings, f) },
    };
  },
  async generateListingDescription(p) {
    await delay(800);
    if (!p.name || !p.location)
      throw Error("Add a property title and location first.");
    return ok(
      `Welcome to ${p.name}, a ${p.type.toLowerCase()} in ${p.location}. With ${p.bedrooms} bedrooms, ${p.bathrooms} bathrooms, and space for ${p.guests} guests, it is a comfortable setting for your next escape.${p.amenities.length ? " Amenities include " + p.amenities.join(", ") + "." : ""}${p.highlights ? " " + p.highlights : ""} Available from ₹${Number(p.price).toLocaleString("en-IN")} per night.`,
    );
  },
};
