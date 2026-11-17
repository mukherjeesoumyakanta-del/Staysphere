import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

export function loadEnvironment() {
  // Load server/.env first, then root .env if present
  dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    quiet: true,
  });
  dotenv.config({
    path: fileURLToPath(new URL("../../../.env", import.meta.url)),
    quiet: true,
  });
}

export function getConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  if (!["development", "test", "production"].includes(nodeEnv))
    throw new Error("NODE_ENV must be development, test, or production");
  const portValue = env.PORT || "5000";
  if (
    !/^\d+$/.test(portValue) ||
    Number(portValue) < 1 ||
    Number(portValue) > 65535
  )
    throw new Error("PORT must be an integer between 1 and 65535");
  let clientUrlRaw = env.CLIENT_URL || env.RENDER_EXTERNAL_URL || env.CORS_ORIGIN || "";
  if (nodeEnv === "production" && !clientUrlRaw.trim()) {
    clientUrlRaw = "https://localhost";
  }
  const origins = (clientUrlRaw || "http://localhost:5173")
    .split(",")
    .map((v) => v.trim());
  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        "CLIENT_URL must contain comma-separated HTTP(S) origins",
      );
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    )
      throw new Error(
        "CLIENT_URL must contain origins only, without paths or trailing slashes",
      );
  }
  if (
    nodeEnv === "production" &&
    origins.some((origin) => !origin.startsWith("https://"))
  )
    throw new Error("CLIENT_URL must use HTTPS in production");
  const jwtSecret = env.JWT_SECRET || "";
  if (jwtSecret && jwtSecret.trim().length < 32)
    throw new Error("JWT_SECRET must be at least 32 characters");
  return Object.freeze({
    nodeEnv,
    port: Number(portValue),
    origins,
    mongoUri: env.MONGO_URI || "",
    jwtSecret,
    jwtTtlSeconds: 7 * 24 * 60 * 60,
    aiApiKey: env.AI_API_KEY || "",
    aiModel:
      env.AI_MODEL ||
      (env.AI_PROVIDER === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"),
    aiProvider: (env.AI_PROVIDER || "gemini").toLowerCase(),
    // MongoDB Atlas Vector Search & Embedding configuration
    embeddingProvider: (env.EMBEDDING_PROVIDER || env.AI_PROVIDER || "gemini").toLowerCase(),
    embeddingApiKey: env.EMBEDDING_API_KEY || env.AI_API_KEY || "",
    embeddingModel: env.EMBEDDING_MODEL || "text-embedding-004",
    embeddingDimensions: Number(env.EMBEDDING_DIMENSIONS) || 768,
    vectorIndexName: env.VECTOR_INDEX_NAME || "property_vector_index",
    vectorSearchEnabled: env.VECTOR_SEARCH_ENABLED !== "false",
  });
}
