/**
 * Guest and Host Booking Response DTOs.
 * Ensures strict field filtering:
 * - Guests cannot see other guests or private host metadata.
 * - Hosts cannot see guest passwords, tokens, or private account data.
 */

export function serializeGuestBooking(doc) {
  if (!doc) return null;
  const id = String(doc._id || doc.id);

  const listing = doc.listingId && typeof doc.listingId === "object"
    ? {
        id: String(doc.listingId._id || doc.listingId.id),
        _id: String(doc.listingId._id || doc.listingId.id),
        title: doc.listingId.title || "",
        name: doc.listingId.title || "",
        city: doc.listingId.city || "",
        state: doc.listingId.state || "",
        location: doc.listingId.location || [doc.listingId.city, doc.listingId.state].filter(Boolean).join(", "),
        propertyType: doc.listingId.propertyType || "Villa",
        pricePerNight: Number(doc.listingId.pricePerNight) || 0,
        price: Number(doc.listingId.pricePerNight) || 0,
        images: Array.isArray(doc.listingId.images)
          ? doc.listingId.images.map((img) => (typeof img === "string" ? img : img.url))
          : [],
      }
    : doc.listingId ? String(doc.listingId) : null;

  return {
    id,
    _id: id,
    listingId: listing,
    listing,
    checkIn: doc.checkIn,
    checkOut: doc.checkOut,
    totalNights: Number(doc.totalNights) || 0,
    totalPrice: Number(doc.totalPrice) || 0,
    status: doc.status || "CONFIRMED",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function serializeHostBooking(doc) {
  if (!doc) return null;
  const base = serializeGuestBooking(doc);

  // Host view includes guest public info (name, avatar) without exposing password hash or private metadata
  const guest = doc.guestId && typeof doc.guestId === "object"
    ? {
        id: String(doc.guestId._id || doc.guestId.id),
        name: doc.guestId.name || "Guest",
        avatar: doc.guestId.avatar || "",
      }
    : null;

  return {
    ...base,
    guestId: guest,
    guest,
    hostId: String(doc.hostId?._id || doc.hostId || ""),
  };
}
