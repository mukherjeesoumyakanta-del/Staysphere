/**
 * HTTP Cache-Control Middleware.
 * Applies public caching headers to discoverable public listings,
 * and strict no-store headers to authenticated, stateful, and AI endpoints.
 */

export function publicCacheControl({ maxAge = 60, staleWhileRevalidate = 120 } = {}) {
  return (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader(
        "Cache-Control",
        `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      );
    }
    next();
  };
}

export function privateNoCache() {
  return (req, res, next) => {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  };
}
