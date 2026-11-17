import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./routes/authRoutes.js";
import { listingRoutes } from "./routes/listingRoutes.js";
import { availabilityRoutes } from "./routes/availabilityRoutes.js";
import { favoriteRoutes } from "./routes/favoriteRoutes.js";
import { bookingRoutes } from "./routes/bookingRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import apiRoutes from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import { getConfig } from "./config/env.js";
import { uploadsDir } from "./config/cloudinary.js";
import { timingMiddleware, getPerformanceStats } from "./middleware/timing.js";
import { sanitizeInputMiddleware } from "./middleware/sanitizeInput.js";
import { privateNoCache } from "./middleware/caching.js";

export function createApp(
  config = getConfig(),
  { users, listings, availabilityRepo, favoriteRepo, bookingRepo } = {}
) {
  const app = express();
  app.locals.config = config;
  app.disable("x-powered-by");

  // High-resolution performance timing and Server-Timing header
  app.use(timingMiddleware());

  // Render terminates TLS at its reverse proxy. Trust exactly one proxy hop.
  if (config.nodeEnv === "production") app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || config.origins.includes(origin))
          return callback(null, true);
        callback(
          new ApiError(
            403,
            "ORIGIN_NOT_ALLOWED",
            "Request origin is not allowed",
          ),
        );
      },
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: config.nodeEnv === "development" ? 10000 : 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (req) => req.path === "/api/health" || req.path === "/api/dev/performance",
      message: {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests; try again later",
        },
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Input sanitization: strips NoSQL operators & Stored XSS tags
  app.use(sanitizeInputMiddleware());

  // Performance stats endpoint for telemetry & viva demonstration
  app.get("/api/dev/performance", (req, res) => {
    res.json({ data: getPerformanceStats() });
  });

  app.use("/uploads", express.static(uploadsDir));
  app.use("/api/auth", privateNoCache(), authRoutes(config, users));
  app.use("/api", listingRoutes(config, { users, listings }));
  app.use(
    "/api",
    availabilityRoutes(config, {
      users,
      availabilityRepo,
      listingRepo: listings,
      bookingRepo,
    })
  );
  app.use(
    "/api",
    privateNoCache(),
    favoriteRoutes(config, {
      users,
      favoriteRepo,
      listingRepo: listings,
    })
  );
  app.use(
    "/api",
    privateNoCache(),
    bookingRoutes(config, {
      users,
      listings,
      bookingRepo,
    })
  );
  app.use(
    "/api",
    privateNoCache(),
    aiRoutes(config, {
      users,
      listings,
    })
  );
  app.use("/api", apiRoutes);

  // Serve static client bundle if built (single-service Render or unified hosting)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(__dirname, "../../dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
        return next();
      }
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
