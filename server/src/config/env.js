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
  const clientUrlRaw = env.CLIENT_URL || env.RENDER_EXTERNAL_URL || env.CORS_ORIGIN || "";
  const rawList = (clientUrlRaw || "")
    .split(",")
    .map((v) => v.trim().replace(/^['"]+|['"]+$/g, ""))
    .filter(Boolean);

  const origins = [];
  for (const item of rawList) {
    try {
      const withProto = /^https?:\/\//i.test(item)
        ? item
        : (item.includes("localhost") || item.includes("127.0.0.1") ? `http://${item}` : `https://${item}`);
      const parsed = new URL(withProto);
      if (!origins.includes(parsed.origin)) {
        origins.push(parsed.origin);
      }
    } catch {
      // Skip invalid entries safely without crashing the server boot
    }
  }

  // Automatically include Render's injected URL if present
  if (env.RENDER_EXTERNAL_URL) {
    try {
      const rOrigin = new URL(env.RENDER_EXTERNAL_URL).origin;
      if (!origins.includes(rOrigin)) origins.push(rOrigin);
    } catch {}
  }

  // Default fallback origins if none configured
  if (origins.length === 0) {
    origins.push("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5000");
  }
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
