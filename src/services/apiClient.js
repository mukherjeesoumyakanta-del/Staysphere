export const API_BASE_URL = (
  import.meta.env?.VITE_API_URL ||
  import.meta.env?.VITE_API_BASE_URL ||
  "/api"
).replace(/\/$/, "");
let unauthorizedHandler = () => {};
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export async function apiRequest(
  path,
  { method = "GET", body, signal, notifyOnUnauthorized = true } = {},
) {
  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      credentials: "include",
      signal: signal || AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(!["GET", "HEAD"].includes(method)
          ? { "X-CSRF-Protection": "1" }
          : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new ApiError(
      error.name === "TimeoutError"
        ? "The account service timed out. Please try again."
        : "Cannot reach the account service. Please check the API URL and connection.",
      0,
      "NETWORK_ERROR",
    );
  }
  if (response.status === 401 && notifyOnUnauthorized) unauthorizedHandler();
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(
      "The account API is not configured. Set VITE_API_BASE_URL to your backend API URL.",
      response.status,
      "API_NOT_CONFIGURED",
    );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      "The account service returned an unreadable response.",
      response.status,
      "INVALID_RESPONSE",
    );
  }
  if (!response.ok) {
    const fieldMsg = result.error?.fields
      ? Object.values(result.error.fields).join(", ")
      : "";
    throw new ApiError(
      fieldMsg || result.error?.message || "The request failed. Please try again.",
      response.status,
      result.error?.code || "REQUEST_FAILED",
    );
  }
  if (!Object.hasOwn(result, "data"))
    throw new ApiError(
      "The account service returned an unexpected response.",
      response.status,
      "INVALID_RESPONSE",
    );
  return result;
}
