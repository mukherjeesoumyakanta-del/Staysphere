import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createAuthService } from "../services/authService.js";
import { authController } from "../controllers/authController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validateAuth, csrfProtection } from "../middleware/validateAuth.js";
export function authRoutes(config, users) {
  const router = Router(),
    service = createAuthService(config, users),
    controller = authController(service, config);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "AUTH_RATE_LIMITED",
        message: "Too many authentication attempts; try again in 15 minutes",
      },
    },
  });
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.post(
    "/register",
    limiter,
    csrfProtection,
    validateAuth("register"),
    controller.register,
  );
  router.post(
    "/login",
    limiter,
    csrfProtection,
    validateAuth("login"),
    controller.login,
  );
  router.post("/logout", csrfProtection, controller.logout);
  router.get("/me", authenticate(service), controller.me);
  router.patch(
    "/profile",
    csrfProtection,
    authenticate(service),
    validateAuth("profile"),
    controller.profile,
  );
  router.post(
    "/switch-role",
    csrfProtection,
    authenticate(service),
    controller.switchRole,
  );
  router.get(
    "/host-access",
    authenticate(service),
    requireRole("HOST"),
    controller.hostAccess,
  );
  return router;
}
