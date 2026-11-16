import { Router } from "express";
import { createAvailabilityService } from "../services/availabilityService.js";
import { createAvailabilityController } from "../controllers/availabilityController.js";
import { createAuthService } from "../services/authService.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { availabilityRepository } from "../repositories/availabilityRepository.js";
import { listingRepository } from "../repositories/listingRepository.js";

export function availabilityRoutes(
  config,
  { users, availabilityRepo, listingRepo } = {}
) {
  const router = Router();
  const service = createAvailabilityService(config, {
    availabilityRepo: availabilityRepo || availabilityRepository,
    listingRepo: listingRepo || listingRepository,
  });
  const controller = createAvailabilityController(service);
  const authService = createAuthService(config, users);

  // GET /api/availability/:listingId/check?checkIn=...&checkOut=... (public check)
  router.get("/availability/:listingId/check", controller.checkAvailability);

  // GET /api/availability/:listingId (public view blocks)
  router.get("/availability/:listingId", controller.getBlocks);

  // POST /api/availability/:listingId/blocks (HOST add block)
  router.post(
    "/availability/:listingId/blocks",
    authenticate(authService),
    requireRole("HOST"),
    controller.addBlock
  );

  // Compatibility route: POST /api/listings/:id/availability
  router.post(
    "/listings/:listingId/availability",
    authenticate(authService),
    requireRole("HOST"),
    controller.addBlock
  );

  // DELETE /api/availability/blocks/:blockId (HOST remove block)
  router.delete(
    "/availability/blocks/:blockId",
    authenticate(authService),
    requireRole("HOST"),
    controller.removeBlock
  );

  // Compatibility route: DELETE /api/listings/:listingId/availability/:blockId
  router.delete(
    "/listings/:listingId/availability/:blockId",
    authenticate(authService),
    requireRole("HOST"),
    controller.removeBlock
  );

  return router;
}
