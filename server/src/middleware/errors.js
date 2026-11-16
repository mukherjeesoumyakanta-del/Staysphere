import { ApiError } from "../utils/ApiError.js";
export function notFound(req, res, next) {
  next(new ApiError(404, "NOT_FOUND", "Route not found"));
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = 500,
    code = "INTERNAL_ERROR",
    message = "An unexpected error occurred";
  if (error instanceof ApiError) {
    ({ status, code, message } = error);
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid account data";
  } else if (
    [
      "MongoServerSelectionError",
      "MongooseServerSelectionError",
      "MongoNetworkError",
    ].includes(error.name)
  ) {
    status = 503;
    code = "DATABASE_UNAVAILABLE";
    message = "Account service is temporarily unavailable";
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Request body must be valid JSON";
  } else if (error.type === "entity.too.large") {
    status = 413;
    code = "BODY_TOO_LARGE";
    message = "Request body exceeds the 100 KB limit";
  } else if (
    error.type === "charset.unsupported" ||
    error.type === "encoding.unsupported"
  ) {
    status = 415;
    code = "UNSUPPORTED_ENCODING";
    message = "Unsupported request encoding";
  }
  // Do not echo request bodies, cookies, credentials, or internal exception messages.
  if (status === 500)
    console.error("Unhandled API error", {
      name: error.name,
      method: req.method,
    });
  res.status(status).json({ error: { code, message } });
}
