import { Router } from "express";
import { createFavoriteService } from "../services/favoriteService.js";
import { createFavoriteController } from "../controllers/favoriteController.js";
import { createAuthService } from "../services/authService.js";
import { authenticate } from "../middleware/auth.js";
import { favoriteRepository } from "../repositories/favoriteRepository.js";
import { listingRepository } from "../repositories/listingRepository.js";

export function favoriteRoutes(
  config,
  { users, favoriteRepo, listingRepo } = {}
) {
  const router = Router();
  const service = createFavoriteService(config, {
    favoriteRepo: favoriteRepo || favoriteRepository,
    listingRepo: listingRepo || listingRepository,
  });
  const controller = createFavoriteController(service);
  const authService = createAuthService(config, users);

  const requireAuth = authenticate(authService);

  // GET /api/favorites (populated listings)
  router.get("/favorites", requireAuth, controller.getFavorites);

  // GET /api/favorites/ids (just listing ID strings)
  router.get("/favorites/ids", requireAuth, controller.getFavoriteIds);

  // POST /api/favorites/:listingId (add)
  router.post("/favorites/:listingId", requireAuth, controller.addFavorite);

  // DELETE /api/favorites/:listingId (remove)
  router.delete("/favorites/:listingId", requireAuth, controller.removeFavorite);

  // PUT /api/favorites/:listingId (toggle)
  router.put("/favorites/:listingId", requireAuth, controller.toggleFavorite);

  return router;
}
