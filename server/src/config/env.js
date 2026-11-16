import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

export function loadEnvironment() {
  const result = dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    quiet: true,
  });
  if (result.error && result.error.code !== "ENOENT")
    throw new Error("Unable to read server environment configuration");
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
  if (nodeEnv === "production" && !env.CLIENT_ORIGIN?.trim())
    throw new Error("CLIENT_ORIGIN is required in production");
  const origins = (env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((v) => v.trim());
  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(
        "CLIENT_ORIGIN must contain comma-separated HTTP(S) origins",
      );
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    )
      throw new Error(
        "CLIENT_ORIGIN must contain origins only, without paths or trailing slashes",
      );
  }
  return Object.freeze({ nodeEnv, port: Number(portValue), origins });
}
