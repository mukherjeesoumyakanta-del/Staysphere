import { ApiError } from "../utils/ApiError.js";

export const COOKIE_NAME = "staysphere_session";

/**
 * Cookie security options:
 * - httpOnly: true prevents client JavaScript from reading the cookie, mitigating XSS token theft.
 * - secure: true ensures the cookie is only transmitted over HTTPS in production.
 * - sameSite: 'none' in production supports cross-origin requests (e.g. Vercel frontend to Render backend).
 */
export function cookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    path: "/",
  };
}

/**
 * Authentication Middleware:
 * Extracts JWT token from the HTTP-only cookie (or Bearer header),
 * validates the signature, and verifies the user exists in MongoDB.
 */
export const authenticate = (service) => async (req, res, next) => {
  try {
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);
    req.user = await service.authenticate(token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC):
 * Server-side guard verifying req.user has the required role (e.g. 'HOST').
 * Prevents unauthorized role escalation (e.g. guests creating properties).
 */
export const requireRole = (role) => (req, res, next) => {
  if (!req.user)
    return next(new ApiError(401, "UNAUTHENTICATED", "Sign in to continue"));
  if (req.user.role !== role)
    return next(
      new ApiError(403, "FORBIDDEN", "This action requires a host account"),
    );
  next();
};
