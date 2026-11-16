import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { getConfig } from "../src/config/env.js";
import { User } from "../src/models/User.js";
const secret = randomBytes(48).toString("hex");
function fixture(extra = {}) {
  const records = new Map();
  const users = {
    findByEmail: async (email) =>
      [...records.values()].find((u) => u.email === email) || null,
    findById: async (id) => records.get(id) || null,
    create: async (input) => {
      if ([...records.values()].some((u) => u.email === input.email))
        throw { code: 11000 };
      const user = {
        ...input,
        _id: new mongoose.Types.ObjectId().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(user._id, user);
      return user;
    },
    updateProfile: async (id, values) => {
      const user = records.get(id);
      if (!user) return null;
      if (
        [...records.values()].some(
          (u) => u._id !== id && u.email === values.email,
        )
      )
        throw { code: 11000 };
      Object.assign(user, values, { updatedAt: new Date() });
      return user;
    },
  };
  const config = getConfig({ NODE_ENV: "test", JWT_SECRET: secret, ...extra });
  const app = createApp(config, { users });
  return { app, users, records, config };
}
const signup = (role) => ({
  name: "Test " + role,
  email: role.toLowerCase() + "@example.com",
  password: "A-test-password-123!",
  role,
});
const post = (agent, path, body) =>
  agent
    .post("/api/auth/" + path)
    .set("X-CSRF-Protection", "1")
    .send(body);
for (const role of ["GUEST", "HOST"])
  test(`${role}: register, persist cookie across requests, login, logout`, async () => {
    const { app, records } = fixture();
    const agent = request.agent(app);
    const values = signup(role);
    const registration = await post(agent, "register", {
      ...values,
      email: " " + values.email.toUpperCase() + " ",
    }).expect(201);
    assert.equal(registration.body.data.role, role);
    assert.equal(registration.body.data.email, values.email);
    assert.ok(!("passwordHash" in registration.body.data));
    assert.ok(!("password" in registration.body.data));
    assert.ok(!("token" in registration.body));
    const cookie = registration.headers["set-cookie"][0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.doesNotMatch(cookie, /; Secure/);
    const stored = [...records.values()][0];
    assert.notEqual(stored.passwordHash, values.password);
    assert.ok(await bcrypt.compare(values.password, stored.passwordHash));
    await agent.get("/api/auth/me").expect(200);
    // A new HTTP client holding the same cookie models browser refresh/session restoration.
    const restored = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookie.split(";")[0])
      .expect(200);
    assert.equal(restored.body.data.id, registration.body.data.id);
    await post(agent, "logout").expect(200);
    await agent.get("/api/auth/me").expect(401);
    const login = await post(agent, "login", {
      email: values.email,
      password: values.password,
    }).expect(200);
    assert.equal(login.body.data.role, role);
    await post(agent, "logout").expect(200);
  });
test("duplicate normalized email and wrong password are rejected", async () => {
  const { app } = fixture();
  await post(request(app), "register", signup("GUEST")).expect(201);
  const duplicate = await post(request(app), "register", {
    ...signup("GUEST"),
    email: " GUEST@EXAMPLE.COM ",
  }).expect(409);
  assert.equal(duplicate.body.error.code, "EMAIL_IN_USE");
  const wrong = await post(request(app), "login", {
    email: "guest@example.com",
    password: "wrong-password",
  }).expect(401);
  const unknown = await post(request(app), "login", {
    email: "unknown@example.com",
    password: "wrong-password",
  }).expect(401);
  assert.deepEqual(wrong.body, unknown.body);
});
test("anonymous, tampered, expired and deleted-user sessions return 401", async () => {
  const { app, records } = fixture();
  await request(app).get("/api/auth/me").expect(401);
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", "staysphere_session=invalid")
    .expect(401);
  const registered = await post(
    request(app),
    "register",
    signup("HOST"),
  ).expect(201);
  const expired = jwt.sign({}, secret, {
    subject: registered.body.data.id,
    expiresIn: -1,
    issuer: "staysphere-api",
    audience: "staysphere-web",
  });
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", "staysphere_session=" + expired)
    .expect(401);
  records.clear();
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", registered.headers["set-cookie"][0].split(";")[0])
    .expect(401);
});
test("server role guard rejects guests and checks the current database role", async () => {
  const { app, records } = fixture(),
    guest = request.agent(app),
    host = request.agent(app);
  await request(app).get("/api/auth/host-access").expect(401);
  await post(guest, "register", signup("GUEST")).expect(201);
  await guest.get("/api/auth/host-access").expect(403);
  const reg = await post(host, "register", signup("HOST")).expect(201);
  await host.get("/api/auth/host-access").expect(200);
  records.get(reg.body.data.id).role = "GUEST";
  await host.get("/api/auth/host-access").expect(403);
});
test("profile updates persist and cannot change roles or password hashes", async () => {
  const { app } = fixture(),
    agent = request.agent(app);
  await post(agent, "register", signup("GUEST")).expect(201);
  const changed = await agent
    .patch("/api/auth/profile")
    .set("X-CSRF-Protection", "1")
    .send({
      name: "Updated Name",
      email: "NEW@example.com",
      avatar: "https://example.com/avatar.png",
    })
    .expect(200);
  assert.equal(changed.body.data.email, "new@example.com");
  assert.ok(!JSON.stringify(changed.body).includes("passwordHash"));
  const me = await agent.get("/api/auth/me").expect(200);
  assert.equal(me.body.data.name, "Updated Name");
  await agent
    .patch("/api/auth/profile")
    .set("X-CSRF-Protection", "1")
    .send({ role: "HOST" })
    .expect(400);
  await post(request(app), "register", signup("HOST")).expect(201);
  await agent
    .patch("/api/auth/profile")
    .set("X-CSRF-Protection", "1")
    .send({ email: "host@example.com" })
    .expect(409);
});
test("invalid input, unknown fields, unsafe avatar and missing CSRF header are rejected", async () => {
  const { app } = fixture();
  await request(app)
    .post("/api/auth/register")
    .send(signup("GUEST"))
    .expect(403);
  for (const change of [
    { role: "ADMIN" },
    { email: { $ne: null } },
    { password: "short" },
    { password: "é".repeat(40) },
    { name: " " },
    { passwordHash: "forged" },
  ])
    await post(request(app), "register", {
      ...signup("GUEST"),
      ...change,
    }).expect(400);
  const agent = request.agent(app);
  await post(agent, "register", signup("HOST")).expect(201);
  await agent
    .patch("/api/auth/profile")
    .set("X-CSRF-Protection", "1")
    .send({ avatar: "javascript:alert(1)" })
    .expect(400);
  await agent
    .patch("/api/auth/profile")
    .send({ name: "Forged Request" })
    .expect(403);
});
test("production cookie is host-only, HTTP-only, Secure and SameSite=None; CORS is exact", async () => {
  const { app } = fixture({
    NODE_ENV: "production",
    CLIENT_URL: "https://staysphere.example",
  });
  const response = await post(request(app), "register", signup("GUEST"))
    .set("Origin", "https://staysphere.example")
    .expect(201);
  const cookie = response.headers["set-cookie"][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /SameSite=None/);
  assert.doesNotMatch(cookie, /Domain=/);
  assert.equal(
    response.headers["access-control-allow-origin"],
    "https://staysphere.example",
  );
  assert.equal(response.headers["access-control-allow-credentials"], "true");
  const logout = await post(request(app), "logout").expect(200);
  assert.match(logout.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/);
  assert.match(logout.headers["set-cookie"][0], /SameSite=None/);
  await post(request(app), "login", {
    email: "guest@example.com",
    password: signup("GUEST").password,
  })
    .set("Origin", "https://evil.example")
    .expect(403);
});
test("registration unique-index races produce safe 409 responses", async () => {
  const { users, config } = fixture();
  users.findByEmail = async () => null;
  users.create = async () => {
    throw { code: 11000 };
  };
  const app = createApp(config, { users });
  const response = await post(request(app), "register", signup("GUEST")).expect(
    409,
  );
  assert.equal(response.body.error.code, "EMAIL_IN_USE");
});
test("authentication attempts are rate limited", async () => {
  const { app } = fixture();
  for (let i = 0; i < 20; i++)
    await post(request(app), "login", {
      email: "invalid",
      password: "short",
    }).expect(400);
  const response = await post(request(app), "login", {
    email: "invalid",
    password: "short",
  }).expect(429);
  assert.equal(response.body.error.code, "AUTH_RATE_LIMITED");
});
test("Mongoose schema normalizes email, validates role and hides hash by default", async () => {
  const user = new User({
    name: "User Name",
    email: " USER@EXAMPLE.COM ",
    passwordHash: "not-a-real-secret",
    role: "HOST",
  });
  await user.validate();
  assert.equal(user.email, "user@example.com");
  assert.ok(User.schema.path("email").options.unique);
  assert.equal(User.schema.path("passwordHash").options.select, false);
  assert.ok(!user.toJSON().passwordHash);
  const bad = new User({
    name: "x",
    email: "x@example.com",
    passwordHash: "x",
    role: "ADMIN",
  });
  await assert.rejects(bad.validate());
});
