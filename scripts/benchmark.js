/**
 * StaySphere Controlled Local Performance Benchmark.
 * Measures throughput (req/s), median (p50), and p95 latency
 * under moderate concurrent traffic without requiring third-party tools.
 */

import http from "node:http";
import { createApp } from "../server/src/app.js";
import { getConfig } from "../server/src/config/env.js";

function getPercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function runBenchmark({ endpoint, totalRequests = 200, concurrency = 10, app }) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const latencies = [];
  let completed = 0;
  let errors = 0;

  console.log(`\nBenchmarking: ${endpoint} (${totalRequests} requests, concurrency ${concurrency})...`);
  const startTime = performance.now();

  async function worker() {
    while (completed < totalRequests) {
      completed++;
      const reqStart = performance.now();
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(`http://127.0.0.1:${port}${endpoint}`, (res) => {
            res.resume();
            res.on("end", () => {
              if (res.statusCode >= 400) errors++;
              resolve();
            });
          });
          req.on("error", reject);
        });
        latencies.push(performance.now() - reqStart);
      } catch (err) {
        errors++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (performance.now() - startTime) / 1000;
  const rps = Math.round(totalRequests / totalTimeSec);
  const avg = Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2));
  const p50 = Number(getPercentile(latencies, 50).toFixed(2));
  const p95 = Number(getPercentile(latencies, 95).toFixed(2));

  await new Promise((resolve) => server.close(resolve));

  const result = {
    endpoint,
    totalRequests,
    concurrency,
    totalTimeSec: Number(totalTimeSec.toFixed(2)),
    rps,
    avgMs: avg,
    p50Ms: p50,
    p95Ms: p95,
    errors,
    errorRate: `${((errors / totalRequests) * 100).toFixed(1)}%`,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const config = getConfig({
    PORT: 0,
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-at-least-32-chars-long-for-benchmark!",
    MONGO_URI: "mongodb://127.0.0.1:27017/staysphere-bench",
    CLIENT_URL: "http://localhost:5173",
  });

  // Fixtures for pure in-memory pipeline latency
  const users = { findById: async () => null };
  const listings = {
    search: async () => ({
      listings: [
        { _id: "1", title: "Luxury Villa", city: "Goa", pricePerNight: 5000, status: "ACTIVE" },
        { _id: "2", title: "Mountain Cabin", city: "Manali", pricePerNight: 3500, status: "ACTIVE" },
      ],
      total: 2,
      page: 1,
      pages: 1,
    }),
    findById: async () => ({ _id: "1", title: "Luxury Villa", status: "ACTIVE", pricePerNight: 5000 }),
  };

  const app = createApp(config, { users, listings });

  console.log("=== StaySphere Benchmark Suite ===");
  await runBenchmark({ endpoint: "/api/health", totalRequests: 300, concurrency: 15, app });
  await runBenchmark({ endpoint: "/api/listings", totalRequests: 300, concurrency: 15, app });
  await runBenchmark({ endpoint: "/api/dev/performance", totalRequests: 100, concurrency: 5, app });
  console.log("\nBenchmark complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
