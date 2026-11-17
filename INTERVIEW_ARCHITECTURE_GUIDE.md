# StaySphere — Technical Interview & Architecture Guide

A complete technical handbook for explaining the StaySphere architecture, design decisions, database operations, security mechanisms, and performance optimizations during final-year B.Tech CSE interviews, viva examinations, and technical discussions.

---

## 1. Project Overview

**StaySphere** is a full-stack property rental discovery and reservation platform built on the MERN stack with Google Gemini Generative AI integration, procedural 3D architectural storytelling, and an atomic date-locking engine.

- **Primary Goal**: Provide a luxury, high-trust stay discovery and booking experience modeled after modern architectural SaaS applications.
- **Architectural Paradigm**: Monolithic, layered REST API with server-side ownership verification, strict DTO serialization, and atomic concurrency guards.
- **Source Repository**: `mukherjeesoumyakanta-del/Staysphere` (branch `main`).

---

## 2. Technology Stack & Technical Rationale

| Layer | Technology | Why Chosen Over Alternatives |
|---|---|---|
| **Frontend UI** | **React 19 + Vite** | Vite provides sub-second Hot Module Replacement (HMR) and optimized Rollup tree-shaking. React 19 provides modern concurrent rendering and unified component composition. |
| **Styling** | **Tailwind CSS v4** | Zero-runtime CSS generation with atomic utility classes, ensuring tiny CSS bundles (< 61 kB) and eliminating CSS specificity conflicts. |
| **3D & Animation** | **Three.js + R3F + GSAP** | React Three Fiber (R3F) provides declarative WebGL scene composition. GSAP ScrollTrigger synchronizes camera trajectories with user scroll without CPU thrashing. |
| **Backend API** | **Node.js 22 LTS + Express.js 5** | Event-driven, non-blocking I/O ideal for I/O-bound CRUD, database lookups, and third-party API streaming. Express 5 provides native async error handling. |
| **Database** | **MongoDB Atlas + Mongoose** | Document-oriented schema naturally maps to nested property structures (amenities, image arrays, location coordinates) with compound unique indexes for atomic booking locks. |
| **Generative AI** | **Google Gemini API (`gemini-1.5-flash`)** | Low-latency (~500ms), cost-effective JSON extraction and copy generation, wrapped in an AI Privacy Gateway with local regex fallbacks. |
| **Media Hosting** | **Cloudinary** | Automatic CDN delivery, format optimization (WebP/AVIF), and thumbnail transformations with a zero-cost local `/uploads` filesystem fallback. |

---

## 3. High-Level Request Flow

```
[Browser / React Client] (localhost:5173 or Vercel)
         │
         │ HTTPS Fetch (credentials: "include", X-CSRF-Protection: "1")
         ▼
[Vite Dev Proxy / Reverse Proxy] (/api/* -> port 5000)
         │
         ▼
[Express Server Middleware Pipeline] (port 5000)
  ├── 1. timingMiddleware()            --> process.hrtime.bigint(), Server-Timing header
  ├── 2. Helmet()                      --> CSP, HSTS, crossOriginResourcePolicy
  ├── 3. CORS()                        --> Whitelist exact origin (with credentials)
  ├── 4. RateLimiter()                 --> 100 req/15min (production), bypass for health
  ├── 5. express.json() & cookieParser --> Parses JSON bodies & signed HTTP-only cookies
  ├── 6. sanitizeInputMiddleware()     --> Neutralizes NoSQL operators ($*) & XSS tags
  └── 7. Cache-Control Middleware      --> public (listings) vs private no-store (auth)
         │
         ▼
[Routers & Controllers] (/api/auth, /api/listings, /api/bookings, /api/ai)
         │
         ▼
[Service Layer] (Business logic, validation, financial calculations)
         │
         ▼
[Mongoose Repositories & Serializers]
         │
         ▼
[MongoDB Atlas Cluster] (Indexed queries, compound unique index locks)
```

---

## 4. Authentication & Security Flow

### Why HTTP-Only Cookies over LocalStorage?
1. **XSS Protection**: Tokens stored in `localStorage` can be stolen by any malicious JavaScript injection (`document.cookie` cannot access `HttpOnly` cookies).
2. **CSRF Mitigation**: Mitigated by custom header validation (`X-CSRF-Protection: 1`) and `SameSite: Lax/None` attributes.
3. **Transport Security**: In production, `secure: true` guarantees transmission exclusively over TLS/HTTPS.

```
Guest/Host Login:
[Client] POST /api/auth/login { email, password }
   │
   ▼
[authController -> authService.login]
   ├── 1. Normalize email & query User collection (with .select("+passwordHash"))
   ├── 2. bcrypt.compare(password, user.passwordHash)
   ├── 3. jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" })
   └── 4. res.cookie("staysphere_session", token, { httpOnly: true, secure, sameSite })
   │
   ▼
[Client receives 200 OK + Set-Cookie Header + serializeSafeUser(user)]
```

---

## 5. Role-Based Access Control (RBAC)

StaySphere enforces two distinct roles:
1. `GUEST`: Can explore properties, manage personal favorites, run AI search, and book active listings.
2. `HOST`: Can create listings, upload photos, edit/delete their own listings, manage blocked dates, and generate AI descriptions.

### RBAC Middleware Implementation (`server/src/middleware/auth.js`):
```javascript
export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "UNAUTHENTICATED", "Sign in to continue"));
  if (req.user.role !== role) {
    return next(new ApiError(403, "FORBIDDEN", "This action requires a host account"));
  }
  next();
};
```
- **Ownership Verification**: Even if authenticated as `HOST`, a host cannot modify another host's property (`listing.hostId.toString() !== req.user.id.toString()` throws 403 Forbidden).

---

## 6. MongoDB Schemas & Relationships

```
┌──────────────────┐            ┌────────────────────────┐
│      User        │            │        Listing         │
├──────────────────┤            ├────────────────────────┤
│ _id (ObjectId)   │ 1        * │ _id (ObjectId)         │
│ name (String)    ├───────────►│ hostId (Ref: User)     │
│ email (Unique)   │            │ title (String)         │
│ passwordHash     │            │ pricePerNight (Number) │
│ role (GUEST/HOST)│            │ status (DRAFT/ACTIVE)  │
└────────┬─────────┘            └───────────┬────────────┘
         │ 1                                │ 1
         │                                  │
         │ *                                │ *
┌────────▼─────────┐            ┌───────────▼────────────┐
│     Booking      │            │      BlockedDate       │
├──────────────────┤            ├────────────────────────┤
│ _id (ObjectId)   │            │ _id (ObjectId)         │
│ listingId (Ref)  │            │ listingId (Ref)        │
│ guestId (Ref)    │            │ startDate (YYYY-MM-DD) │
│ checkIn, checkOut│            │ endDate (YYYY-MM-DD)   │
│ totalPrice       │            │ reason (BOOKED/MAINT)  │
└──────────────────┘            └────────────────────────┘
```

---

## 7. The Date-Interval Overlap Algorithm (With Dry Run)

### The Mathematical Principle
Two half-open date intervals $[A_{\text{start}}, A_{\text{end}})$ and $[B_{\text{start}}, B_{\text{end}})$ overlap **if and only if**:
$$\text{Existing.startDate} < \text{Requested.endDate} \quad \text{AND} \quad \text{Existing.endDate} > \text{Requested.startDate}$$

### Dry-Run Example
Suppose Villa Goa has an existing booking:
- Existing: `[2026-12-10, 2026-12-15)`

**Scenario A: Overlapping Request** (`2026-12-12` to `2026-12-18`)
1. Is `2026-12-10 < 2026-12-18`? **TRUE**.
2. Is `2026-12-15 > 2026-12-12`? **TRUE**.
- **Result**: Overlap detected! Request rejected with **409 Conflict**.

**Scenario B: Adjacent / Back-to-Back Request** (`2026-12-15` to `2026-12-20`)
1. Is `2026-12-10 < 2026-12-20`? **TRUE**.
2. Is `2026-12-15 > 2026-12-15`? **FALSE** (Strict inequality).
- **Result**: No overlap! Guest checks in on the same day the prior guest checked out. Allowed!

---

## 8. GenAI Features & The Privacy Gateway

```
Guest Natural Language: "Find me a 2-bedroom villa in Goa under ₹8000 with a pool"
                              │
                              ▼
        [server/src/services/aiPrivacyService.js]
  ├── 1. sanitizeSearchPrompt:
  │      - Enforces 3–500 character limit
  │      - Redacts emails (/[a-z0-9._%+-]+@.../ -> [REDACTED_EMAIL])
  │      - Redacts phone numbers (\b\d{10}\b -> [REDACTED_PHONE])
  │      - Strips internal MongoDB ObjectIDs (24-hex -> [REDACTED_ID])
  ├── 2. extractDeterministicFilters (< 1ms local regex):
  │      - Extracts { city: "Goa", propertyType: "Villa", maxPrice: 8000, bedrooms: 2, amenities: ["Pool"] }
  │
  ├── 3. LLM API Call (Google Gemini / gemini-1.5-flash):
  │      - 12-second timeout via AbortSignal.timeout(12000)
  │      - Returns structured JSON filter proposal
  │      - If API throttled/offline: falls back instantly to deterministic filters
  │
  └── 4. validateAiFilters (Anti-Injection & Type Sanitization):
         - Whitelist keys only (discards $where, __proto__, etc.)
         - Maps to safe Mongoose query:
           Listing.find({ status: "ACTIVE", city: /Goa/i, pricePerNight: { $lte: 8000 }, ... })
```

---

## 9. Database Indexes & Query Optimizations

| Collection | Index | Purpose & Explain Plan Rationale |
|---|---|---|
| `User` | `{ email: 1 }` (unique) | $O(1)$ B-tree index lookup for login, prevents duplicate account registration races |
| `Listing` | `{ hostId: 1 }` | Prevents full table scan (COLLSCAN) when hosts view their property portfolio in `/host/listings` |
| `Listing` | `{ status: 1, createdAt: -1 }` | Compound index powering the default public explore and discovery feed |
| `Listing` | `{ status: 1, city: 1 }` | Fast index-supported lookups for location-filtered searches |
| `Listing` | `{ status: 1, pricePerNight: 1 }` | Efficient price-range filtering and low-to-high sorting |
| `BlockedDate` | `{ listingId: 1, startDate: 1, endDate: 1 }` | Powers the overlap query: isolates the listing then scans the date interval in B-tree order |
| `Favorite` | `{ userId: 1, listingId: 1 }` (unique) | Enforces idempotency: a user can only favorite a property once |

### Mongoose `.lean()` Optimization
- By default, Mongoose wraps query results in full Mongoose Document instances with getters, setters, virtuals, and change-tracking state.
- For read-only endpoints (e.g. `GET /api/listings`), chaining `.lean()` skips Mongoose Document hydration, returning plain JavaScript objects. This reduces heap allocations by ~60% and speeds up response serialization.

---

## 10. Frontend Optimization & Bundle Splitting

### Vendor Chunking (`vite.config.js`)
Configured `rollupOptions.output.manualChunks` to split large third-party packages into distinct, long-term cacheable vendor bundles:
- `three-vendor`: Contains `three` and `@react-three` (~1.39 MB uncompressed). Loaded lazily only when visiting 3D architecture pages.
- `recharts-vendor`: Contains charting dependencies (~421 kB). Loaded lazily only on the host analytics tab.
- `animation-vendor`: Contains `framer-motion` and `gsap` (~280 kB).
- `index.js` (Main application bundle): Reduced from **668 kB** down to **96.9 kB** (**85.5% reduction!**).

---

## 11. Frequently Asked Interview Questions & Concise Answers

### Q1: Why use a monolithic MERN architecture instead of microservices for this project?
**Answer**: For an application with 20–100 concurrent users, microservices introduce substantial operational overhead (network serialization latency, distributed transactions, service discovery, cross-service debugging). A well-structured modular monolith provides sub-10ms in-process function calls, shared memory efficiency, transactional database operations, and a vastly simplified deployment pipeline.

### Q2: How do you prevent double-booking when two guests book the same dates simultaneously?
**Answer**: Double-booking is prevented using MongoDB unique compound constraints. Each night in a reservation is decomposed into atomic `BookingNight` records with a unique index on `{ listingId, night }`. If two requests attempt to book overlapping dates simultaneously, the first write succeeds and the second triggers a MongoDB Duplicate Key Error (code 11000), which the service catches and translates into a safe `409 Conflict: Dates unavailable` error.

### Q3: What is the purpose of the Server-Timing header?
**Answer**: The `Server-Timing: total;dur=X.XX` header communicates backend execution time directly to browser DevTools and telemetry endpoints. It allows frontend developers to distinguish between network transit latency and backend server processing time.

### Q4: How is Stored XSS prevented in listing descriptions?
**Answer**: The `sanitizeInputMiddleware` recursively inspects all incoming request bodies and strips HTML tags (such as `<script>`, `<iframe>`, `<img>`) using regular expression tag stripping before fields reach database models. Furthermore, React JSX automatically escapes strings during rendering.

### Q5: What happens if the Gemini AI API goes down or exceeds its rate limit?
**Answer**: The platform uses a graceful degradation architecture. The `aiPrivacyService` runs local deterministic regex extractors (< 1ms) that parse locations, budgets, bedroom counts, and property types directly from the prompt. If the Gemini API fails, times out (12s limit), or returns an error, the system automatically falls back to deterministic filters, querying real active MongoDB listings without crashing or displaying fake data.
