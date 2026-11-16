import { ApiError } from "../utils/ApiError.js";
import { favoriteRepository } from "../repositories/favoriteRepository.js";
import { listingRepository } from "../repositories/listingRepository.js";

export function createFavoriteService(
  config,
  {
    favoriteRepo = favoriteRepository,
    listingRepo = listingRepository,
  } = {}
) {
  return {
    async getFavorites(userId) {
      const records = await favoriteRepo.findByUser(userId);
      // Filter out any where listing was deleted or is not active
      const valid = records
        .filter((r) => r.listingId && r.listingId.status === "ACTIVE")
        .map((r) => ({
          id: String(r._id || r.id),
          listingId: String(r.listingId._id || r.listingId.id || r.listingId),
          listing: r.listingId,
          createdAt: r.createdAt,
        }));

      const listingIds = valid.map((v) => v.listingId);
      return {
        favorites: valid,
        listingIds,
      };
    },

    async getFavoriteIds(userId) {
      return favoriteRepo.getUserFavoriteListingIds(userId);
    },

    async addFavorite(userId, listingId) {
      const listing = await listingRepo.findById(listingId);
      if (!listing || listing.status !== "ACTIVE") {
        throw new ApiError(404, "NOT_FOUND", "Active listing not found");
      }

      await favoriteRepo.add(userId, listingId);
      const listingIds = await favoriteRepo.getUserFavoriteListingIds(userId);
      return {
        listingId: String(listingId),
        favorited: true,
        listingIds,
      };
    },

    async removeFavorite(userId, listingId) {
      await favoriteRepo.remove(userId, listingId);
      const listingIds = await favoriteRepo.getUserFavoriteListingIds(userId);
      return {
        listingId: String(listingId),
        favorited: false,
        listingIds,
      };
    },

    async toggleFavorite(userId, listingId) {
      const listing = await listingRepo.findById(listingId);
      if (!listing || listing.status !== "ACTIVE") {
        throw new ApiError(404, "NOT_FOUND", "Active listing not found");
      }

      const existing = await favoriteRepo.findByUserAndListing(userId, listingId);
      let favorited = false;
      if (existing) {
        await favoriteRepo.remove(userId, listingId);
        favorited = false;
      } else {
        await favoriteRepo.add(userId, listingId);
        favorited = true;
      }

      const listingIds = await favoriteRepo.getUserFavoriteListingIds(userId);
      return {
        listingId: String(listingId),
        favorited,
        listingIds,
      };
    },
  };
}
