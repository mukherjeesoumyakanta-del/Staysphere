/**
 * Public and Host Listing Response DTOs.
 * Ensures strict field filtering so private database metadata,
 * host personal details, and internal Mongoose fields are never exposed.
 */

export function serializePublicListing(doc) {
  if (!doc) return null;

  return {
    _id: String(doc._id || doc.id),
    id: String(doc._id || doc.id),
    title: doc.title || "",
    description: doc.description || "",
    city: doc.city || "",
    state: doc.state || "",
    location: doc.location || [doc.city, doc.state].filter(Boolean).join(", "),
    propertyType: doc.propertyType || "Villa",
    pricePerNight: Number(doc.pricePerNight) || 0,
    maxGuests: Number(doc.maxGuests) || 1,
    bedrooms: Number(doc.bedrooms) || 0,
    bathrooms: Number(doc.bathrooms) || 0,
    amenities: Array.isArray(doc.amenities) ? doc.amenities : [],
    images: Array.isArray(doc.images)
      ? doc.images.map((img) => ({
          url: typeof img === "string" ? img : img.url,
          publicId: typeof img === "object" ? img.publicId || "" : "",
        }))
      : [],
    status: doc.status || "ACTIVE",
    viewCount: Number(doc.viewCount) || 0,
    // Opaque host identifier for client-side ownership check (isHostOfListing)
    // without exposing host email, phone, name, or private account data
    hostId: String(doc.hostId?._id || doc.hostId || ""),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function serializeHostListing(doc) {
  if (!doc) return null;
  // Host view includes the same clean fields, preserving publicId for deletion
  return serializePublicListing(doc);
}
