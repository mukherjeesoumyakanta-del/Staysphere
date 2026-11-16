import { apiRequest, API_BASE_URL } from "./apiClient.js";

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
  return p.toString();
}

export const listingApiService = {
  /** GET /api/listings?... → { data: { listings, total, page, pages } } */
  async getListings(filters = {}) {
    const qs = buildQuery(filters);
    const result = await apiRequest(`/listings${qs ? "?" + qs : ""}`);
    return {
      data: {
        listings: (result.data.listings || []).map(normalizeListing),
        total: result.data.total || 0,
        page: result.data.page || 1,
        pages: result.data.pages || 1,
      },
    };
  },

  /** GET /api/listings/:id */
  async getListingById(id) {
    const result = await apiRequest(`/listings/${id}`);
    return { data: normalizeListing(result.data) };
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
    const res = await apiRequest(`/availability/${listingId}`);
    return res.data || [];
  },

  /** GET /api/availability/:listingId/check?checkIn=...&checkOut=... */
  async checkAvailability(listingId, checkIn, checkOut) {
    const res = await apiRequest(
      `/availability/${listingId}/check?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
    );
    return res.data;
  },

  /** POST /api/availability/:listingId/blocks */
  async addBlock(listingId, { start, end, reason }) {
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
