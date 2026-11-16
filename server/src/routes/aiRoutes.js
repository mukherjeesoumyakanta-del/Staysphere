import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { createAiService } from "../services/aiService.js";
import { createAiController } from "../controllers/aiController.js";
import { createAuthService } from "../services/authService.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { listingRepository } from "../repositories/listingRepository.js";
import { createAiClient } from "../services/aiProvider.js";

export function aiRoutes(
  config,
  { users, listings, aiClient, aiService } = {}
) {
  const router = Router();
  const listingRepo = listings || listingRepository;
  const client = aiClient || createAiClient(config);
  const service =
    aiService ||
    createAiService(config, { aiClient: client, listingRepo });
  const controller = createAiController(service);
  const authService = createAuthService(config, users);

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config?.nodeEnv === "test" ? 1000 : 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message:
          "AI request limit exceeded. Please wait a moment and try again.",
      },
    },
  });

  // POST /api/ai/search - public property search
  router.post("/ai/search", aiLimiter, controller.search);

  // POST /api/ai/description - authenticated HOST only
  router.post(
    "/ai/description",
    aiLimiter,
    authenticate(authService),
    requireRole("HOST"),
    controller.description
  );

  return router;
}
