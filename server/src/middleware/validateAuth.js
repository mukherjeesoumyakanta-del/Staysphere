import { ApiError } from "../utils/ApiError.js";
const invalid = (message) => {
  throw new ApiError(400, "VALIDATION_ERROR", message);
};
function email(value) {
  if (
    typeof value !== "string" ||
    value.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )
    invalid("Enter a valid email address");
  return value.trim().toLowerCase();
}
function name(value) {
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    value.trim().length > 80
  )
    invalid("Name must contain 2–80 characters");
  return value.trim();
}
function password(value) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    Buffer.byteLength(value, "utf8") > 72
  )
    invalid(
      "Password must have at least 8 characters and at most 72 UTF-8 bytes",
    );
  return value;
}
export function validateAuth(kind) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body))
      invalid("A JSON object is required");
    const allowed =
      kind === "register"
        ? ["name", "email", "password", "role"]
        : kind === "login"
          ? ["email", "password"]
          : ["name", "email", "avatar", "role"];
    if (Object.keys(body).some((k) => !allowed.includes(k)))
      invalid("Request contains unsupported fields");
    if (kind === "register") {
      if (!["GUEST", "HOST"].includes(body.role))
        invalid("Role must be GUEST or HOST");
      req.validated = {
        name: name(body.name),
        email: email(body.email),
        password: password(body.password),
        role: body.role,
      };
    } else if (kind === "login")
      req.validated = {
        email: email(body.email),
        password: password(body.password),
      };
    else {
      if (!Object.keys(body).length)
        invalid("Provide at least one profile field");
      req.validated = {};
      if ("name" in body) req.validated.name = name(body.name);
      if ("email" in body) req.validated.email = email(body.email);
      if ("avatar" in body) {
        if (typeof body.avatar !== "string" || body.avatar.length > 2048)
          invalid("Avatar must be an HTTPS image URL");
        if (body.avatar) {
          let url;
          try {
            url = new URL(body.avatar);
          } catch {
            invalid("Avatar must be an HTTPS image URL");
          }
          if (url.protocol !== "https:" || url.username || url.password)
            invalid("Avatar must be an HTTPS image URL");
        }
        req.validated.avatar = body.avatar;
      }
      if ("role" in body) {
        if (!["GUEST", "HOST"].includes(body.role))
          invalid("Role must be GUEST or HOST");
        req.validated.role = body.role;
      }
    }
    next();
  };
}
// A required non-simple header forces browser preflight and blocks form-based CSRF.
export function csrfProtection(req, res, next) {
  if (req.get("X-CSRF-Protection") !== "1")
    return next(
      new ApiError(403, "CSRF_REJECTED", "Missing CSRF protection header"),
    );
  next();
}
