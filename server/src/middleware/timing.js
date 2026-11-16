/**
 * Performance & Latency Timing Middleware.
 * Adds Server-Timing HTTP header, tracks route-templated latency,
 * and maintains an in-memory ring buffer of the last 100 requests
 * with average, p50, and p95 calculations.
 */

const MAX_RING_BUFFER_SIZE = 100;
const ringBuffer = [];

/**
 * Normalizes dynamic URL parameters into stable route templates.
 * e.g., /api/listings/6afadde5ec01aad82312a82b -> /api/listings/:id
 */
export function normalizeRouteTemplate(req) {
  const path = req.baseUrl || req.path || req.url || "/";
  return path
    .replace(/\b[0-9a-fA-F]{24}\b/g, ":id")
    .replace(/\b\d+\b/g, ":num")
    .split("?")[0];
}

export function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

export function getPerformanceStats() {
  const durations = ringBuffer.map((r) => r.durationMs).sort((a, b) => a - b);
  const total = durations.reduce((acc, d) => acc + d, 0);
  const count = durations.length;

  return {
    count,
    avgMs: count > 0 ? Number((total / count).toFixed(2)) : 0,
    p50Ms: calculatePercentile(durations, 50),
    p95Ms: calculatePercentile(durations, 95),
    minMs: count > 0 ? durations[0] : 0,
    maxMs: count > 0 ? durations[durations.length - 1] : 0,
    recent: [...ringBuffer].reverse().slice(0, 20),
  };
}

export function timingMiddleware() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    // Hook res.end to record total duration
    const origEnd = res.end;
    res.end = function (...args) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      const roundedMs = Number(durationMs.toFixed(2));

      // Append Server-Timing header if not already sent
      if (!res.headersSent) {
        res.setHeader("Server-Timing", `total;dur=${roundedMs}`);
      }

      // Record in rolling ring buffer
      const route = normalizeRouteTemplate(req);
      ringBuffer.push({
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: roundedMs,
        timestamp: new Date().toISOString(),
      });

      if (ringBuffer.length > MAX_RING_BUFFER_SIZE) {
        ringBuffer.shift();
      }

      return origEnd.apply(this, args);
    };

    next();
  };
}
