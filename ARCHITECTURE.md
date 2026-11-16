# StaySphere — Architecture & System Design

StaySphere is a production-grade, AI-powered property rental discovery and management platform built on the MERN stack (MongoDB, Express.js, React, Node.js) with Google Gemini integration, 3D architectural storytelling, and atomic booking availability.

---

## 1. High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React + Vite)                     │
│  - Cinematic Homepage (GSAP ScrollTrigger + Procedural Three.js WebGL) │
│  - Dynamic Property Explorer (Filters, Sort, Pagination)               │
│  - Real-Time Availability Calendar (React Day Picker)                  │
│  - Role-Guarded Dashboards (Guest & Host Workspaces)                   │
│  - AI Property Finder & AI Description Generator UI                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / JSON / Cookies / Multipart
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER (Express.js)                        │
│  Middleware:                                                           │
│   ├── Security: Helmet (CORP: cross-origin), CORS Allowlist, RateLimit │
│   ├── Auth: JWT HTTP-only Cookies, CSRF Headers, DB Role Guards        │
│   ├── Uploads: Multer memory storage → Cloudinary / Local Fallback     │
│   └── Sanitized Error Handlers: Standard JSON ApiError                 │
│                                                                        │
│  Services & Repositories:                                              │
│   ├── authService         → User Mongoose Model                        │
│   ├── listingService      → Listing Mongoose Model                     │
│   ├── availabilityService → BlockedDate & Booking Mongoose Models      │
│   ├── bookingService      → Booking & BookingNight (Atomic Locks)      │
│   ├── favoriteService     → Favorite Mongoose Model                    │
│   └── aiService           → aiProvider (Gemini REST API / Fallback)    │
└──────────────────┬───────────────────────────────┬─────────────────────┘
                   │                               │
                   ▼                               ▼
┌─────────────────────────────────────┐  ┌───────────────────────────────┐
│       DATABASE (MongoDB Atlas)      │  │        EXTERNAL APIS          │
│  - users (email, bcrypt hash, role) │  │  - Google Gemini 1.5 Flash    │
│  - listings (properties, amenities) │  │    (Grounded Filter Parsing & │
│  - bookings (dates, total, status)  │  │     Listing Copywriting)      │
│  - bookingnights (unique date locks)│  │  - Cloudinary (Image CDN)     │
│  - blockeddates (host blocks)       │  │                               │
│  - favorites (user saved listings)  │  │                               │
└─────────────────────────────────────┘  └───────────────────────────────┘
```

---

## 2. Component Design & Patterns

### 2.1 Backend: Service-Repository Architecture
The Express API separates concerns into distinct layers:
1. **Controllers** (`server/src/controllers/`): Route handlers that unwrap request parameters and return consistent `{ data: ... }` responses or delegate errors to `next(error)`.
2. **Services** (`server/src/services/`): Pure business logic, validation enforcement, grounded query building, and external service communication.
3. **Repositories** (`server/src/repositories/`): Direct Mongoose database interactions. In tests, repositories can be injected with in-memory doubles without a live database.
4. **App Factory** (`server/src/app.js`): `createApp(config, dependencies)` separates express app creation from network listening (`server.js`), enabling fast, isolated integration testing.

### 2.2 Database Schemas & Indices
- **`User`**: Normalized email (unique sparse index), bcrypt hash, role (`GUEST` | `HOST`), timestamps.
- **`Listing`**: Title, description, city, state, location, propertyType (`Apartment`, `Villa`, `Cabin`, etc.), pricePerNight, maxGuests, bedrooms, bathrooms, amenities (string array), images (`[{ url, publicId }]`), status (`DRAFT` | `ACTIVE`), viewCount.
- **`Booking`**: Reference to `listingId`, `guestId`, `hostId`, date strings `checkIn` and `checkOut` in `YYYY-MM-DD` format, `totalNights`, `totalPrice`, and status (`CONFIRMED` | `CANCELLED`).
- **`BookingNight`**: Atomic concurrency lock model. Unique compound index:
  ```javascript
  bookingNightSchema.index({ listingId: 1, date: 1 }, { unique: true });
  ```
  Every reserved night is individually inserted. If two guests attempt to book overlapping dates concurrently, MongoDB raises a duplicate key error (code 11000) on the second transaction, immediately preventing double-booking race conditions without external Redis locks.
- **`BlockedDate`**: Host calendar blocks with `[startDate, endDate)` date intervals.

---

## 3. Concurrency & Availability Flow

All date intervals follow end-exclusive interval math:
$$\text{Interval} = [\text{checkIn}, \text{checkOut})$$
Two intervals $[s_1, e_1)$ and $[s_2, e_2)$ overlap if and only if:
$$s_1 < e_2 \quad \text{and} \quad e_1 > s_2$$

This guarantees that:
- Checkout on a date and another guest's check-in on the same date do not collide.
- When a booking is confirmed, `BookingNight` documents are written atomically.
- When a booking is cancelled, `BookingNight` documents are deleted immediately, freeing dates in real time.

---

## 4. Generative AI Architecture

The system features two AI integrations powered by Google Gemini:

```
[User Natural Query: "Villa in Goa under 6000 for 4 people with pool"]
                               │
                               ▼
               [POST /api/ai/search (Public Rate-Limited)]
                               │
                               ▼
                   [aiProvider (Gemini 1.5 Flash)]
               Prompt Engineering & JSON Schema Extraction
                               │
                               ▼
         Extracted Filters: { city: "Goa", maxPrice: 6000, maxGuests: 4, amenities: ["Pool"] }
                               │
                               ▼
                [validateAiFilters: Strips Mongo Operators]
                               │
                               ▼
        [MongoDB Query: Listing.find({ status: "ACTIVE", ...filters })]
                               │
                               ▼
                 Grounded Real Properties Returned (No Hallucinations)
```

1. **AI Property Finder (`POST /api/ai/search`)**:
   - Accepts free-form natural language query from guests.
   - Uses Gemini with a JSON schema instruction to extract structured filters: `city`, `minPrice`, `maxPrice`, `guests`, `bedrooms`, `propertyType`, and `amenities`.
   - The server sanitizes the extracted filters (stripping any MongoDB operators or unexpected keys).
   - Queries real `ACTIVE` listings from MongoDB Atlas.
   - If no properties match, returns an explanation without inventing fake properties.
2. **AI Listing Description Generator (`POST /api/ai/description`)**:
   - Authenticated to `HOST` users only.
   - Accepts factual property specs from the create/edit form (title, location, propertyType, bedrooms, bathrooms, guests, amenities).
   - Uses Gemini with strict anti-hallucination instructions to generate an engaging, professional editorial description using *only* provided facts.

---

## 5. Security & Authentication Architecture

- **Session Tokens**: Signed JWTs containing `sub: userId` and `role: "GUEST" | "HOST"`.
- **Cookie Security**:
  - `httpOnly: true` (JavaScript cannot read tokens; immune to XSS token theft).
  - `secure: true` in production (enforces HTTPS transmission).
  - `sameSite: "none"` in production (supports cross-origin credentials between Vercel and Render).
  - `path: "/"`.
- **CSRF Protection**: All mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) require the `X-CSRF-Protection: 1` custom header, neutralizing browser CSRF exploits.
- **Database Role Verification**: Authorization checks query the current database user document on each request rather than trusting stale client tokens.
- **Origin Whitelist**: Dynamic CORS validation checks against `CLIENT_URL` / `CORS_ORIGIN` environment settings.
