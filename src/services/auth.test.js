import { test } from "node:test";
import assert from "node:assert/strict";
import { authService } from "./authService.js";
const user = {
  id: "user-1",
  name: "Guest",
  email: "guest@example.com",
  role: "GUEST",
};
function mockResponse(data, status = 200) {
  return new Response(
    JSON.stringify(
      status < 400
        ? { data }
        : { error: { message: "Unauthorized", code: "UNAUTHENTICATED" } },
    ),
    { status, headers: { "content-type": "application/json" } },
  );
}
test("auth client sends credentials and CSRF header, restores from server, clears on logout", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let cookieSession = null;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/login") || url.endsWith("/register"))
      cookieSession = user;
    if (url.endsWith("/logout")) cookieSession = null;
    return url.endsWith("/me") && !cookieSession
      ? mockResponse(null, 401)
      : mockResponse(cookieSession);
  };
  try {
    await authService.login(user.email, "test-password");
    assert.deepEqual(authService.getUser(), user);
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[0].options.headers["X-CSRF-Protection"], "1");
    assert.equal(JSON.parse(calls[0].options.body).password, "test-password");
    assert.deepEqual((await authService.me()).data, user);
    assert.ok(calls.at(-1).url.endsWith("/auth/me"));
    await authService.logout();
    assert.equal(authService.getUser(), null);
    assert.equal((await authService.me()).data, null);
  } finally {
    globalThis.fetch = original;
  }
});
test("API failures do not fall back to a demo identity", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => mockResponse(null, 401);
  try {
    await assert.rejects(authService.login("host@staysphere.demo", "Demo123!"));
    assert.equal(authService.getUser(), null);
  } finally {
    globalThis.fetch = original;
  }
});
test("unconfigured API and network errors are useful instead of silently accepting login", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response("<html>frontend</html>", {
        headers: { "content-type": "text/html" },
      });
    await assert.rejects(
      authService.login(user.email, "password"),
      /not configured/,
    );
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(authService.me(), /Cannot reach/);
  } finally {
    globalThis.fetch = original;
  }
});

test("legacy localStorage credentials are removed and never restored as auth state", async () => {
  const original = globalThis.localStorage;
  let storage = JSON.stringify({
    listings: [],
    favorites: [],
    recent: [],
    user: { id: "forged", role: "HOST" },
    accounts: [{ email: "old@example.com", password: "legacy-password" }],
  });
  globalThis.localStorage = {
    getItem: () => storage,
    setItem: (key, value) => {
      storage = value;
    },
  };
  try {
    const { read } = await import("./index.js?legacy-migration");
    const state = read();
    assert.ok(!("user" in state));
    assert.ok(!("accounts" in state));
    assert.ok(!storage.includes("legacy-password"));
    assert.ok(!storage.includes("forged"));
  } finally {
    globalThis.localStorage = original;
  }
});

test("a stale session-restoration response cannot overwrite a newer login", async () => {
  const original = globalThis.fetch;
  let resolveMe;
  globalThis.fetch = (url) =>
    url.endsWith("/me")
      ? new Promise((resolve) => {
          resolveMe = resolve;
        })
      : Promise.resolve(mockResponse(user));
  try {
    const pending = authService.me();
    await authService.login(user.email, "test-password");
    resolveMe(mockResponse(null, 401));
    await pending;
    assert.deepEqual(authService.getUser(), user);
  } finally {
    globalThis.fetch = original;
  }
});
