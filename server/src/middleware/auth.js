import { ApiError } from "../utils/ApiError.js";
export const COOKIE_NAME = "staysphere_session";
export function cookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    path: "/",
  };
}
export const authenticate = (service) => async (req, res, next) => {
  try {
    req.user = await service.authenticate(req.cookies[COOKIE_NAME]);
    next();
  } catch (error) {
    next(error);
  }
};
export const requireRole = (role) => (req, res, next) => {
  if (!req.user)
    return next(new ApiError(401, "UNAUTHENTICATED", "Sign in to continue"));
  if (req.user.role !== role)
    return next(
      new ApiError(403, "FORBIDDEN", "This action requires a host account"),
    );
  next();
};
