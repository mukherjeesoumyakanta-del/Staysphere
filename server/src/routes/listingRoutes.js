import { Router } from "express";
import { createListingService } from "../services/listingService.js";
import { createListingController } from "../controllers/listingController.js";
import { createAuthService } from "../services/authService.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { uploadImages, processImages } from "../middleware/upload.js";
import { validateListing } from "../middleware/validateListing.js";
import { listingRepository } from "../repositories/listingRepository.js";

export function listingRoutes(config, { users, listings } = {}) {
  const router = Router();
  const listingRepo = listings || listingRepository;
  const service = createListingService(config, listingRepo);
  const controller = createListingController(service);
  const authService = createAuthService(config, users);

  // GET /api/listings - public
  router.get("/listings", controller.list);

  // GET /api/listings/:id - public, increment viewCount if ACTIVE
  router.get("/listings/:id", async (req, res, next) => {
    try {
      const listing = await service.getOne(req.params.id);
      // Increment viewCount asynchronously if ACTIVE (don't await, best-effort)
      if (listing && listing.status === "ACTIVE") {
        if (typeof listingRepo.incrementViewCount === "function") {
          listingRepo.incrementViewCount(req.params.id).catch(() => {});
        } else if (typeof listingRepo.update === "function") {
          listingRepo
            .update(req.params.id, { viewCount: (listing.viewCount || 0) + 1 })
            .catch(() => {});
        }
      }
      res.json({ data: listing });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/host/listings - authenticated HOST
  router.get(
    "/host/listings",
    authenticate(authService),
    requireRole("HOST"),
    controller.hostListings
  );

  // POST /api/listings - authenticated HOST
  router.post(
    "/listings",
    authenticate(authService),
    requireRole("HOST"),
    uploadImages,
    processImages,
    validateListing("create"),
    controller.create
  );

  // PATCH /api/listings/:id - authenticated HOST
  router.patch(
    "/listings/:id",
    authenticate(authService),
    requireRole("HOST"),
    uploadImages,
    processImages,
    validateListing("update"),
    controller.update
  );

  // DELETE /api/listings/:id - authenticated HOST
  router.delete(
    "/listings/:id",
    authenticate(authService),
    requireRole("HOST"),
    controller.remove
  );

  return router;
}
