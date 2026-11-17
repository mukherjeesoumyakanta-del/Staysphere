# StaySphere — Performance Audit & Baseline Analysis

**Date**: November 17, 2026  
**Project**: StaySphere — MERN + Gemini AI Property Discovery & Management Platform  
**Target Environment**: Monolithic MERN (Node.js 22 LTS, React 19, MongoDB Atlas, Google Gemini API)  
**Concurrency Target**: 20–100 concurrent active users (realistic final-year B.Tech CSE MVP)

---

## 1. Executive Summary & Baseline Metrics

Before performing refactoring and optimizations, an end-to-end baseline audit was conducted across the frontend, Express API server, MongoDB queries, and GenAI gateway.

| Metric | Measured Baseline | Notes / Conditions |
|---|---|---|
| **Client Test Suite** | 11 passed, 0 failed | Executed via Node test runner (`node --test src/services/*.test.js`) |
| **Server Test Suite** | 61 passed, 0 failed | Executed via Node test runner (`server/test/*.test.js`) |
| **Total Automated Tests** | 72 passed, 0 failed | 100% pass rate across auth, listings, bookings, AI, security |
| **Initial Bundle Size (index.js)** | 668.05 kB (gzip: 204.01 kB) | Monolithic vendor bundle prior to manual chunking |
| **3D Villa Scene Component Size** | 999.71 kB (gzip: 270.55 kB) | Bundled Three.js and Drei in main component chunk |
| **Analytics Component Size** | 423.06 kB (gzip: 116.88 kB) | Bundled Recharts library in component chunk |
| **Production Build Duration** | 28.05 seconds | Full Vite production build on Node 22 |
| **API Health Endpoint Latency** | ~2–5 ms | Local HTTP in-memory test via Supertest |
| **Public Listings Query Latency** | ~6–15 ms | Local indexed query execution via Mongoose `.lean()` |
| **MongoDB Atlas Connection Time** | ~1,200–1,800 ms | Initial TLS handshake and pool establishment to Atlas cluster |

---

## 2. Component Performance Audit Matrix

| Component | Existing Issue | Proposed Improvement | Complexity | Risk |
|---|---|---|---|---|
| **Vite Bundle Splitting** | Monolithic entry bundle (668 kB) bundling all vendor code into `index.js`, forcing even simple pages (like `/login` or `/about`) to download heavy 3D and chart dependencies | Configure `rollupOptions.output.manualChunks` in `vite.config.js` to isolate `three-vendor`, `recharts-vendor`, `animation-vendor`, and `icons-vendor` into dedicated cached chunks | Low | Low (Pure build-time optimization) |
| **MongoDB Query Projections** | Some queries in `favoriteRepository` populated `listingId` without an explicit field selection, transferring unnecessary database fields over the wire | Apply explicit `.select()` projections on all populated Mongoose queries (e.g. `title, city, state, location, propertyType, pricePerNight, images`) | Low | Low (Preserves existing data contract) |
| **MongoDB Indexes** | Without proper compound indexes on listings, searches filtering by location, price, and status risk full collection scans (COLLSCAN) | Maintain compound indexes: `{ status: 1, createdAt: -1 }`, `{ status: 1, city: 1 }`, `{ status: 1, pricePerNight: 1 }`, `{ hostId: 1 }`, and `{ listingId: 1, startDate: 1, endDate: 1 }` | Low | Low (Zero schema changes, speeds up queries) |
| **Express API Compression & Headers** | API responses lacked HTTP compression and public cache headers on read-only discovery routes, causing redundant data transfer for repeated listing fetches | Apply lightweight `Cache-Control: public, max-age=60, stale-while-revalidate=120` to public listing endpoints and high-resolution `Server-Timing` headers | Low | Low (Cached only on public read-only listings) |
| **Three.js WebGL Rendering** | `VillaScene` rendered at high device pixel ratio on mobile screens, increasing GPU work and power consumption | Cap DPR at `[1, 1.4]`, use `frameloop="demand"`, `powerPreference="low-power"`, pause updates offscreen, and provide a lightweight WebGL error fallback | Low | Low (Preserves visual fidelity while protecting mobile battery) |
| **GenAI Request Latency & Reliability** | AI search and description endpoints lacked local deterministic extraction, making requests vulnerable to external LLM throttling or network timeouts | Implement local deterministic regex extractor (< 1ms) in `aiPrivacyService` as a fast zero-cost layer, paired with 12s timeout and error shielding | Low | Low (Graceful fallback prevents app hangs) |
| **Code Readability & Dead Code** | Redundant helper methods, trailing debug logs, and duplicate sanitization routines in controllers and repositories | Remove unused helpers, centralize input sanitization in middleware, and add concise comments explaining critical logic for interview viva | Low | Low (Full test suite guarantees regression safety) |
| **Development Workflow** | Frontend (`vite`) and backend (`node server.js`) previously required two separate terminal commands, creating confusion for evaluators | Created unified `scripts/dev.js` executed via `npm run dev` to start both Express API (port 5000) and Vite frontend (port 5173) in one terminal | Low | Low (Zero external dependencies, uses native Node.js) |
