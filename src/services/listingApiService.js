import { apiRequest, API_BASE_URL } from "./apiClient.js";
import { properties } from "../data/properties.js";
import { read, write } from "./index.js";

/**
 * Normalize a listing document from the API to match the shape
 * the existing UI code expects (name, price, type, guests, images as string[]).
 */
export function normalizeListing(doc) {
  if (!doc) return null;
  return {
    // identity
    id: doc._id || doc.id,
    hostId: doc.hostId?._id || doc.hostId || doc.hostId,
    // display fields — map API names → legacy UI names
    name: doc.title || doc.name || "",
    location: doc.location || [doc.city, doc.state].filter(Boolean).join(", "),
    city: doc.city || "",
    state: doc.state || "",
    type: doc.propertyType || doc.type || "Villa",
    price: doc.pricePerNight || doc.price || 0,
    bedrooms: doc.bedrooms ?? 0,
    bathrooms: doc.bathrooms ?? 0,
    guests: doc.maxGuests || doc.guests || 1,
    amenities: doc.amenities || [],
    description: doc.description || "",
    highlights: doc.highlights || "",
    status: (doc.status || "DRAFT").toLowerCase(), // keep UI compat ("active"/"draft")
    // images: API returns [{url, publicId}]; UI needs string[]
    images: Array.isArray(doc.images)
      ? doc.images.map((img) => (typeof img === "string" ? img : img.url))
      : [],
    // raw images for the host form (to know publicIds for removal)
    _images: doc.images || [],
    viewCount: doc.viewCount || 0,
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    // keep availability blocks if present (local-only feature)
    blocks: doc.blocks || [],
  };
}

function buildQuery(filters = {}) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.city) p.set("city", filters.city);
  if (filters.min) p.set("minPrice", filters.min);
  if (filters.max) p.set("maxPrice", filters.max);
  if (filters.guests) p.set("maxGuests", filters.guests);
  if (filters.bedrooms) p.set("bedrooms", filters.bedrooms);
  if (filters.type) p.set("propertyType", filters.type);
  if (filters.amenities?.length)
    filters.amenities.forEach((a) => p.append("amenities", a));
  if (filters.sort) p.set("sort", filters.sort);
  if (filters.page) p.set("page", filters.page);
  if (filters.limit) p.set("limit", filters.limit);
  return p.toString();
}

export const listingApiService = {
  /** GET /api/listings?... → { data: { listings, total, page, pages } } */
  async getListings(filters = {}) {
    const qs = buildQuery(filters);
    let apiList = [];
    let total = 0;
    let page = 1;
    let pages = 1;
    try {
      const result = await apiRequest(`/listings${qs ? "?" + qs : ""}`);
      apiList = (result.data.listings || []).map(normalizeListing);
      total = result.data.total || 0;
      page = result.data.page || 1;
      pages = result.data.pages || 1;
    } catch {
      apiList = [];
    }

    // Merge with demo properties so both demo listings and host created listings are available!
    const demoItems = (read().listings || properties).filter(
      (demo) => !apiList.some((api) => String(api.id) === String(demo.id))
    );

    let filteredDemos = demoItems;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      filteredDemos = filteredDemos.filter(
        (p) =>
          (p.name || p.title || "").toLowerCase().includes(q) ||
          (p.location || p.city || "").toLowerCase().includes(q)
      );
    }
    if (filters.city) {
      filteredDemos = filteredDemos.filter((p) =>
        (p.city || p.location || "")
          .toLowerCase()
          .includes(filters.city.toLowerCase())
      );
    }
    if (filters.type) {
      filteredDemos = filteredDemos.filter(
        (p) => (p.type || p.propertyType) === filters.type
      );
    }
    if (filters.min) {
      filteredDemos = filteredDemos.filter(
        (p) => (p.price || p.pricePerNight) >= Number(filters.min)
      );
    }
    if (filters.max) {
      filteredDemos = filteredDemos.filter(
        (p) => (p.price || p.pricePerNight) <= Number(filters.max)
      );
    }
    if (filters.guests) {
      filteredDemos = filteredDemos.filter(
        (p) => (p.guests || p.maxGuests) >= Number(filters.guests)
      );
    }
    if (filters.bedrooms) {
      filteredDemos = filteredDemos.filter(
        (p) => (p.bedrooms || 0) >= Number(filters.bedrooms)
      );
    }

    const combined = [...apiList, ...filteredDemos];
    return {
      data: {
        listings: combined,
        total: Math.max(total, combined.length),
        page,
        pages: Math.max(pages, 1),
      },
    };
  },

  /** GET /api/listings/:id */
  async getListingById(id) {
    if (!id) throw new Error("Listing ID is required");
    // If it's a demo stay ID, look up demo data directly
    if (String(id).startsWith("stay-")) {
      const allDemos = read().listings || properties;
      const found = allDemos.find((p) => String(p.id) === String(id));
      if (found) return { data: found };
    }

    // Try MongoDB API
    try {
      const result = await apiRequest(`/listings/${id}`);
      if (result && result.data) {
        return { data: normalizeListing(result.data) };
      }
    } catch (err) {
      // Fallback to local demo list
      const allDemos = read().listings || properties;
      const found = allDemos.find(
        (p) => String(p.id) === String(id) || String(p._id) === String(id)
      );
      if (found) return { data: found };
      throw err;
    }

    const allDemos = read().listings || properties;
    const found = allDemos.find(
      (p) => String(p.id) === String(id) || String(p._id) === String(id)
    );
    if (found) return { data: found };

    return { data: null };
  },

  /** GET /api/host/listings */
  async getHostListings() {
    const result = await apiRequest("/host/listings");
    return { data: (result.data || []).map(normalizeListing) };
  },

  /** POST /api/listings (multipart) */
  async createListing(fields, imageFiles = []) {
    const fd = _buildFormData(fields, imageFiles);
    return _multipartRequest("POST", "/listings", fd);
  },

  /** PATCH /api/listings/:id (multipart) */
  async updateListing(id, fields, imageFiles = []) {
    const fd = _buildFormData(fields, imageFiles);
    return _multipartRequest("PATCH", `/listings/${id}`, fd);
  },

  /** DELETE /api/listings/:id */
  async deleteListing(id) {
    return apiRequest(`/listings/${id}`, { method: "DELETE" });
  },
};

export const availabilityApiService = {
  /** GET /api/availability/:listingId */
  async getBlocks(listingId) {
    if (!listingId) return [];
    if (String(listingId).startsWith("stay-")) {
      const allDemos = read().listings || properties;
      const found = allDemos.find((p) => String(p.id) === String(listingId));
      return found?.blocks || [];
    }
    try {
      const res = await apiRequest(`/availability/${listingId}`);
      return res.data || [];
    } catch {
      const allDemos = read().listings || properties;
      const found = allDemos.find((p) => String(p.id) === String(listingId));
      return found?.blocks || [];
    }
  },

  /** GET /api/availability/:listingId/check?checkIn=...&checkOut=... */
  async checkAvailability(listingId, checkIn, checkOut) {
    if (String(listingId).startsWith("stay-")) {
      const allDemos = read().listings || properties;
      const found = allDemos.find((p) => String(p.id) === String(listingId));
      const bl = found?.blocks || [];
      const overlap = bl.some((b) => {
        const s = b.start || b.startDate;
        const e = b.end || b.endDate;
        return s < checkOut && e > checkIn;
      });
      return { available: !overlap };
    }
    const res = await apiRequest(
      `/availability/${listingId}/check?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
    );
    return res.data;
  },

  /** POST /api/availability/:listingId/blocks */
  async addBlock(listingId, { start, end, reason }) {
    if (String(listingId).startsWith("stay-")) {
      const newBlock = {
        id: "block-" + Date.now(),
        listingId,
        start,
        end,
        startDate: start,
        endDate: end,
        reason: reason || "HOST_BLOCKED",
      };
      write((s) => {
        const target = (s.listings || []).find((l) => String(l.id) === String(listingId));
        if (target) {
          target.blocks = target.blocks || [];
          target.blocks.push(newBlock);
        }
      });
      return newBlock;
    }
    const res = await apiRequest(`/availability/${listingId}/blocks`, {
      method: "POST",
      body: { start, end, reason },
    });
    return res.data;
  },

  /** DELETE /api/availability/blocks/:blockId */
  async removeBlock(blockId) {
    const res = await apiRequest(`/availability/blocks/${blockId}`, {
      method: "DELETE",
    });
    return res.data;
  },
};

export const favoriteApiService = {
  /** GET /api/favorites */
  async getFavorites() {
    const res = await apiRequest("/favorites");
    return res.data;
  },

  /** GET /api/favorites/ids */
  async getFavoriteIds() {
    const res = await apiRequest("/favorites/ids");
    return res.data || [];
  },

  /** POST /api/favorites/:listingId */
  async addFavorite(listingId) {
    const res = await apiRequest(`/favorites/${listingId}`, { method: "POST" });
    return res.data;
  },

  /** DELETE /api/favorites/:listingId */
  async removeFavorite(listingId) {
    const res = await apiRequest(`/favorites/${listingId}`, {
      method: "DELETE",
    });
    return res.data;
  },

  /** PUT /api/favorites/:listingId (toggle) */
  async toggleFavorite(listingId) {
    const res = await apiRequest(`/favorites/${listingId}`, { method: "PUT" });
    return res.data;
  },
};

export const bookingApiService = {
  /** POST /api/bookings */
  async createBooking({ listingId, checkIn, checkOut }) {
    const isDemo = !listingId || String(listingId).startsWith("stay-");
    if (!isDemo) {
      try {
        const res = await apiRequest("/bookings", {
          method: "POST",
          body: { listingId, checkIn, checkOut },
        });
        return res.data;
      } catch (err) {
        console.warn("Backend booking fallback to local booking:", err.message);
      }
    }

    // Demo / fallback booking
    const dIn = new Date(checkIn + "T12:00:00Z");
    const dOut = new Date(checkOut + "T12:00:00Z");
    const totalNights = Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
    const allDemos = read().listings || properties;
    const demo = allDemos.find((p) => String(p.id) === String(listingId)) || {};
    const totalPrice = totalNights * (demo.price || demo.pricePerNight || 5000);
    const fakeBooking = {
      id: "booking-" + Date.now(),
      _id: "booking-" + Date.now(),
      listingId: String(listingId),
      checkIn,
      checkOut,
      totalNights,
      totalPrice,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
      listing: {
        id: listingId,
        title: demo.name || demo.title || "StaySphere Retreat",
        name: demo.name || demo.title || "StaySphere Retreat",
        city: demo.city || "Goa",
        location: demo.location || "Goa",
        images: demo.images || [],
      },
    };
    try {
      write((s) => {
        s.bookings = s.bookings || [];
        s.bookings.unshift(fakeBooking);
        const target = (s.listings || []).find((l) => String(l.id) === String(listingId));
        if (target) {
          target.blocks = target.blocks || [];
          target.blocks.push({
            id: "block-" + Date.now(),
            start: checkIn,
            end: checkOut,
            startDate: checkIn,
            endDate: checkOut,
            reason: "BOOKED",
          });
        }
      });
    } catch {}
    return fakeBooking;
  },

  /** GET /api/bookings/my */
  async getMyBookings() {
    try {
      const res = await apiRequest("/bookings/my");
      const serverBookings = res.data || [];
      const localBookings = read().bookings || [];
      return [...serverBookings, ...localBookings];
    } catch {
      return read().bookings || [];
    }
  },

  /** GET /api/bookings/host */
  async getHostBookings() {
    try {
      const res = await apiRequest("/bookings/host");
      return res.data || [];
    } catch {
      return [];
    }
  },

  /** GET /api/bookings/:id */
  async getBooking(id) {
    const res = await apiRequest(`/bookings/${id}`);
    return res.data;
  },

  /** PATCH /api/bookings/:id/cancel */
  async cancelBooking(id) {
    const res = await apiRequest(`/bookings/${id}/cancel`, {
      method: "PATCH",
    });
    return res.data;
  },
};

function _buildFormData(fields, imageFiles) {
  const fd = new FormData();
  // Append scalar fields individually (multer reads them from req.body)
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => fd.append(key, v));
    } else {
      fd.append(key, value);
    }
  }
  // Append image Files
  for (const file of imageFiles) {
    fd.append("images", file);
  }
  return fd;
}

async function _multipartRequest(method, path, formData) {
  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      credentials: "include",
      headers: { "X-CSRF-Protection": "1" },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    throw new Error(
      err.name === "TimeoutError"
        ? "The request timed out. Please try again."
        : "Cannot reach the server. Check your connection.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unexpected response.");
  }
  if (!response.ok) {
    const fieldDetails = result?.error?.fields
      ? Object.values(result.error.fields).join(", ")
      : "";
    throw new Error(
      fieldDetails || result?.error?.message || "The request failed. Please try again.",
    );
  }
  return { data: result.data ? normalizeListing(result.data) : result.data };
}
