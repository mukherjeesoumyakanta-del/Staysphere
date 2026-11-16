/**
 * Input Sanitization Middleware.
 * 1. Blocks NoSQL operator injection by stripping or rejecting keys containing '$', '.', or '['
 * 2. Neutralizes Stored XSS by stripping executable HTML tags from string inputs.
 */

const HTML_TAG_REGEX = /<[^>]*>?/gm;

export function containsNoSqlOperator(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 8) return false;

  for (const key of Object.keys(obj)) {
    if (key.includes("$") || key.includes(".") || key.includes("[")) {
      return true;
    }
    if (typeof obj[key] === "object" && obj[key] !== null) {
      if (containsNoSqlOperator(obj[key], depth + 1)) {
        return true;
      }
    }
  }
  return false;
}

export function sanitizeObjectStrings(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 8) return;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string") {
      // Strip dangerous HTML tags
      obj[key] = val.replace(HTML_TAG_REGEX, "").trim();
    } else if (typeof val === "object" && val !== null) {
      sanitizeObjectStrings(val, depth + 1);
    }
  }
}

export function sanitizeInputMiddleware() {
  return (req, res, next) => {
    // 1. Guard against NoSQL operator injection in query params and body
    if (containsNoSqlOperator(req.query)) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "Prohibited query operator detected.",
        },
      });
    }

    if (req.body && typeof req.body === "object") {
      if (containsNoSqlOperator(req.body)) {
        return res.status(400).json({
          error: {
            code: "INVALID_INPUT",
            message: "Prohibited operator in request payload.",
          },
        });
      }

      // 2. Strip HTML tags from strings to neutralize stored XSS
      sanitizeObjectStrings(req.body);
    }

    next();
  };
}
