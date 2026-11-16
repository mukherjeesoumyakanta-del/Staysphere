import { Router } from "express";
import { createBookingService } from "../services/bookingService.js";
import { createBookingController } from "../controllers/bookingController.js";
import { createAuthService } from "../services/authService.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { bookingRepository } from "../repositories/bookingRepository.js";
import { listingRepository } from "../repositories/listingRepository.js";

export function bookingRoutes(
  config,
  { users, listings, bookingRepo = bookingRepository } = {}
) {
  const router = Router();
  const listingRepo = listings || listingRepository;
  const service = createBookingService(config, {
    bookingRepo,
    listingRepo,
  });
  const controller = createBookingController(service);
  const authService = createAuthService(config, users);

  const requireAuth = authenticate(authService);

  // POST /api/bookings - create booking
  router.post("/bookings", requireAuth, controller.create);

  // GET /api/bookings/my - current user's bookings
  router.get("/bookings/my", requireAuth, controller.myBookings);

  // GET /api/bookings/host - host's property reservations
  router.get(
    "/bookings/host",
    requireAuth,
    requireRole("HOST"),
    controller.hostBookings
  );

  // GET /api/bookings/:id - get single booking details
  router.get("/bookings/:id", requireAuth, controller.getOne);

  // PATCH /api/bookings/:id/cancel - cancel a booking
  router.patch("/bookings/:id/cancel", requireAuth, controller.cancel);

  return router;
}
