import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config/env.js";
import { errorHandler } from "../src/middleware/errors.js";
const app = createApp(getConfig({ NODE_ENV: "test" }));

test("health is HTTP 200 with a truthful liveness response and security headers", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.deepEqual(response.body, {
    data: { status: "ok", service: "staysphere-api" },
  });
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});
test("CORS allows configured browser origins with credentials, rejects other origins", async () => {
  const allowed = await request(app)
    .get("/api/health")
    .set("Origin", "http://localhost:5173")
    .expect(200);
  assert.equal(
    allowed.headers["access-control-allow-origin"],
    "http://localhost:5173",
  );
  assert.equal(allowed.headers["access-control-allow-credentials"], "true");
  const denied = await request(app)
    .get("/api/health")
    .set("Origin", "https://untrusted.example")
    .expect(403);
  assert.equal(denied.body.error.code, "ORIGIN_NOT_ALLOWED");
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
  await request(app)
    .options("/api/health")
    .set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "GET")
    .expect(204);
});
test("unknown routes return consistent JSON errors", async () => {
  const res = await request(app).get("/api/not-a-route").expect(404);
  assert.deepEqual(res.body, {
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});
test("malformed JSON and oversized request bodies are rejected", async () => {
  const malformed = await request(app)
    .post("/api/not-a-route")
    .set("Content-Type", "application/json")
    .send("{bad")
    .expect(400);
  assert.equal(malformed.body.error.code, "INVALID_JSON");
  const large = await request(app)
    .post("/api/not-a-route")
    .send({ text: "a".repeat(110 * 1024) })
    .expect(413);
  assert.equal(large.body.error.code, "BODY_TOO_LARGE");
});
test("unexpected errors are sanitized rather than exposing internals", async () => {
  const failing = express();
  failing.get("/failure", () => {
    throw new Error("sensitive-internal-value");
  });
  failing.use(errorHandler);
  const res = await request(failing).get("/failure").expect(500);
  assert.deepEqual(res.body, {
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
});
test("rate limiter caps API traffic while health remains available", async () => {
  const limited = createApp(getConfig({ NODE_ENV: "test" }));
  for (let i = 0; i < 100; i++)
    await request(limited).get("/api/unknown").expect(404);
  const res = await request(limited).get("/api/unknown").expect(429);
  assert.equal(res.body.error.code, "RATE_LIMITED");
  await request(limited).get("/api/health").expect(200);
});
test("configuration validates deployment settings without requiring future-service secrets", () => {
  assert.equal(getConfig({ PORT: "5051" }).port, 5051);
  assert.equal(getConfig({ PORT: "" }).port, 5000);
  for (const PORT of ["0", "-1", "65536", "text", "12.5"])
    assert.throws(() => getConfig({ PORT }), /PORT/);
  assert.throws(() => getConfig({ NODE_ENV: "production" }), /CLIENT_ORIGIN/);
  assert.throws(() => getConfig({ CLIENT_ORIGIN: "*" }), /CLIENT_ORIGIN/);
  assert.throws(
    () => getConfig({ CLIENT_ORIGIN: "https://example.com/path" }),
    /origins only/,
  );
  assert.equal(
    getConfig({ NODE_ENV: "production", CLIENT_ORIGIN: "https://example.com" })
      .nodeEnv,
    "production",
  );
});
