import { Favorite } from "../models/Favorite.js";

export const favoriteRepository = {
  async findByUser(userId) {
    return Favorite.find({ userId })
      .populate({
        path: "listingId",
        match: { status: "ACTIVE" },
        select: "title city state location propertyType pricePerNight images maxGuests bedrooms bathrooms status hostId",
      })
      .sort({ createdAt: -1 })
      .lean();
  },

  async getUserFavoriteListingIds(userId) {
    const list = await Favorite.find({ userId }).select("listingId").lean();
    return list.map((f) => String(f.listingId));
  },

  async findByUserAndListing(userId, listingId) {
    return Favorite.findOne({ userId, listingId }).lean();
  },

  async add(userId, listingId) {
    try {
      const created = await Favorite.create({ userId, listingId });
      return created.toObject ? created.toObject() : created;
    } catch (err) {
      if (err.code === 11000) {
        // Already favorited (idempotent)
        return Favorite.findOne({ userId, listingId }).lean();
      }
      throw err;
    }
  },

  async remove(userId, listingId) {
    const res = await Favorite.deleteOne({ userId, listingId });
    return { removed: res.deletedCount > 0 };
  },
};
