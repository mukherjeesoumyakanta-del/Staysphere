import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { authRoutes } from "./routes/authRoutes.js";
import { listingRoutes } from "./routes/listingRoutes.js";
import apiRoutes from "./routes/index.js";
import { ApiError } from "./utils/ApiError.js";
import { notFound, errorHandler } from "./middleware/errors.js";
import { getConfig } from "./config/env.js";

export function createApp(config = getConfig(), { users, listings } = {}) {
  const app = express();
  app.locals.config = config;
  app.disable("x-powered-by");
  // Render terminates TLS at its reverse proxy. Trust exactly one proxy hop.
  if (config.nodeEnv === "production") app.set("trust proxy", 1);
  app.use(helmet());
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
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (req) => req.path === "/api/health",
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
  app.use("/api/auth", authRoutes(config, users));
  app.use("/api", listingRoutes(config, { users, listings }));
  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
