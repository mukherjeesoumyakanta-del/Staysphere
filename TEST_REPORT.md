# StaySphere — Automated Test Execution & Baseline Report

**Execution Timestamp:** 2026-11-17T13:13:00+05:30  
**Environment:** Node.js v25.2.1 LTS / Express 5 / Vite 6 / React 19  
**Test Framework:** Native Node.js Test Runner (`node:test`, `node:assert/strict`) + Supertest  
**Status:** **77 / 77 Tests Passed (0 Failures)**

---

## 1. Summary

| Test Suite | Total Tests | Passed | Failed | Duration |
|------------|-------------|--------|--------|----------|
| **Client Services (`src/services/*.test.js`)** | 11 | 11 | 0 | ~1.1s |
| **Server API (`server/test/*.test.js`)** | 66 | 66 | 0 | ~9.9s |
| **Total** | **77** | **77** | **0** | **~11.0s** |

---

## 2. Server Test Suites Verified

### 1. `app.test.js` (6 tests)
- Health check returns `HTTP 200` with status `ok` and security headers (`X-Content-Type-Options: nosniff`).
- CORS allows configured origins (`http://localhost:5173`) with credentials; rejects unauthorized origins.
- Unknown routes return consistent JSON error format `{ error: { code, message } }`.
- Malformed JSON and oversized request bodies (> 100 KB) are safely rejected.
- Uncaught errors are sanitized into generic internal errors without leaking stack traces.
- Rate limiter caps traffic while keeping `/api/health` accessible.

### 2. `auth.test.js` (11 tests)
- GUEST registration, login, JWT session persistence, and logout.
- HOST registration, login, and role-based route guard.
- Duplicate email prevention (unique index race condition returns HTTP 409).
- Tampered, expired, or deleted user sessions return HTTP 401.
- Profile update validation prevents changing roles or injecting password hashes.
- CSRF header protection (`X-CSRF-Protection: 1`) on state-changing requests.

### 3. `listings.test.js` (11 tests)
- Host creates listing with image upload metadata.
- Host updates listing; ownership check prevents other hosts from editing.
- Public discovery returns only `ACTIVE` listings (filters out `DRAFT`).
- Filter logic: `minPrice`, `maxPrice`, `propertyType`, `bedrooms`, `maxGuests`.
- Pagination: `page` and `limit` calculations.
- Validation: missing title, negative price, or invalid property type return HTTP 400.

### 4. `bookings.test.js` (8 tests)
- Guest creates booking for active listing with server-calculated price and nights.
- Host cannot book their own property (HTTP 403 Forbidden).
- Overlapping booking dates are rejected with HTTP 409 Conflict.
- Adjacent non-overlapping bookings (checkIn on another's checkOut date) succeed.
- Atomic double-booking prevention backed by `BookingNight` unique compound index.
- Booking cancellation frees dates back to availability.

### 5. `availability_favorites.test.js` (7 tests)
- Host adds blocked date range; adjacent non-overlapping blocks accepted.
- Interval overlap algorithm `(start < end2 && end > start2)` rejects collisions with HTTP 409.
- Guest favorites: add, list, toggle, delete with idempotent operations.

### 6. `vector_search.test.js` (5 tests)
- `buildPropertySearchText` extracts only public attributes and excludes prices, emails, phone numbers, and secrets.
- `generateMockEmbedding` produces normalized 768-dimensional unit vector ($L_2 \approx 1.0$) for cosine similarity.
- `createEmbeddingService` operates safely without network in test environments.
- `listingService.create` populates `searchText` and vector metadata.
- `listingService.update` regenerates vector only when searchable text changes (skips regeneration on price-only updates).

### 7. `ai.test.js` (5 tests)
- Filter schema validation strips malicious query operators.
- Natural-language search returns real grounded MongoDB active listings.
- Rejects prompts that are empty or exceed 500 characters.
- Generates factual grounded descriptions without making up amenities.

### 8. `security_privacy.test.js` (13 tests)
- Privacy serializers strip password hashes, host emails, and internal MongoDB metadata.
- NoSQL operator injection (`$gt`, `$ne`, `$where`) in query parameters is rejected.
- Stored XSS: HTML and script tags are stripped by input sanitization middleware.
- Gemini privacy gateway: prompts never include user emails, phone numbers, or credentials.
- `Server-Timing` header is attached to HTTP responses.
- HTTP caching headers: public listings have cache headers, authenticated routes use `no-store`.

---

## 3. Client Unit Tests Verified

### `src/services/auth.test.js` (5 tests)
- Auth client sends credentials and CSRF header, restores session from server, and clears on logout.
- API failures never fall back to an assumed demo identity.
- Unconfigured API and network errors produce user-friendly error messages.
- Stale session-restoration responses cannot overwrite newer logins.
- Legacy localStorage credentials are removed.

### `src/services/services.test.js` (6 tests)
- Client filter logic correctly combines budget, location, guests, type, and amenities.
- AI search returns matching centralized properties and handles unknown inputs.
- AI description generator strictly uses provided facts.
- Favorite toggling is reversible and idempotent.
- Availability calendar validation rejects past and overlapping ranges.

---

## 4. Production Build Verification

```
vite v6.4.6 building for production...
transforming...
✓ 3956 modules transformed.
rendering chunks...
✓ built in 24.96s (dist/ verified, 0 errors)
```
