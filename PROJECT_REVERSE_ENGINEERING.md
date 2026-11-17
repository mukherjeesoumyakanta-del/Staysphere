# StaySphere — Technical Reverse-Engineering Guide for Interviews

> **Quick Summary:** StaySphere is a full-stack MERN property rental discovery and management platform. It combines a React 19 + Three.js 3D frontend with an Express 5 + MongoDB Atlas backend, featuring Google Gemini GenAI and MongoDB Atlas Semantic Vector Search.

---

## 1. Folder Structure at a Glance

```
Staysphere/
├── public/                 # Static assets (3D fallback images, videos)
├── src/                    # Frontend React 19 Application
│   ├── components/         # Reusable UI (Buttons, Grids, Calendar, 3D Canvas)
│   │   └── cinematic/      # Three.js VillaScene & GSAP ScrollTrigger
│   ├── context/            # Store.jsx (Global auth state, favorites, listings)
│   ├── data/               # properties.js (Demo catalog & taxonomy)
│   ├── pages/              # Route pages (Home, Explore, Property, Auth, Host, Guest)
│   ├── services/           # apiClient.js, authService.js, listingApiService.js
│   ├── App.jsx             # React Router (6.x/7.x) route definitions
│   ├── main.jsx            # React root mount point (createRoot)
│   └── styles.css          # Tailwind CSS + custom glassmorphic styling
├── server/                 # Backend Node.js 22 / Express 5 API
│   ├── config/             # property-vector-index.json (Atlas Vector Index definition)
│   ├── scripts/            # backfillEmbeddings.js, seed-listings.js, check-database.js
│   ├── src/
│   │   ├── config/         # database.js (Mongoose connect), env.js, cloudinary.js
│   │   ├── controllers/    # auth, listing, booking, availability, favorite, ai, health
│   │   ├── middleware/     # auth.js (JWT verify), validateAuth.js, validateListing.js, errors.js
│   │   ├── models/         # User, Listing, Booking, BookingNight, BlockedDate, Favorite
│   │   ├── repositories/   # Direct Mongoose queries (user, listing, booking, availability)
│   │   ├── routes/         # authRoutes, listingRoutes, bookingRoutes, aiRoutes, availabilityRoutes
│   │   ├── serializers/    # bookingSerializer, listingSerializer, userSerializer (PII protection)
│   │   ├── services/       # authService, listingService, bookingService, aiService, embeddingService
│   │   ├── app.js          # Express app factory (middleware, routes, error handling)
│   │   └── server.js       # Production HTTP listener on port 5000
│   └── test/               # app.test.js (Automated integration test suite)
├── scripts/dev.js          # Unified local development server runner (starts backend + frontend)
├── vercel.json             # Vercel deployment configuration
├── render.yaml             # Render deployment configuration
└── package.json            # Root scripts and workspace dependencies
```

---

## 2. Core Entry Points

### Frontend Entry Point
1. **HTML Shell**: [`index.html`](file:///d:/STAYSPHERE/Staysphere/index.html) loads `#root` and triggers [`src/main.jsx`](file:///d:/STAYSPHERE/Staysphere/src/main.jsx).
2. **React Mount**: `main.jsx` initializes `ReactDOM.createRoot()`, wraps the app in `<StoreProvider>` ([`src/context/Store.jsx`](file:///d:/STAYSPHERE/Staysphere/src/context/Store.jsx)), and mounts `<App />` ([`src/App.jsx`](file:///d:/STAYSPHERE/Staysphere/src/App.jsx)).
3. **Routing**: `App.jsx` declares client routes (`/`, `/explore`, `/property/:id`, `/auth`, `/guest/*`, `/host/*`).

### Backend Entry Point
1. **Startup**: [`server/src/server.js`](file:///d:/STAYSPHERE/Staysphere/server/src/server.js) loads `.env`, connects to MongoDB via `connectDatabase()`, instantiates Express via `createApp()`, and listens on `PORT` (default 5000).
2. **App Factory**: [`server/src/app.js`](file:///d:/STAYSPHERE/Staysphere/server/src/app.js) applies Helmet, CORS allowlist, Rate Limiting, cookie parser, body parser, and mounts all `/api` routes.

---

## 3. How React Communicates with Express

```
[React Browser] ──(fetch)──> [Vite Dev Proxy: localhost:5173/api] ──> [Express API: 127.0.0.1:5000/api]
```

- In development, Vite's proxy (`vite.config.js`) forwards all requests starting with `/api` and `/uploads` to `http://127.0.0.1:5000`.
- In production, [`src/services/apiClient.js`](file:///d:/STAYSPHERE/Staysphere/src/services/apiClient.js) sends requests directly to the deployed backend URL via `VITE_API_BASE_URL`.
- All mutating requests (`POST`, `PATCH`, `DELETE`) automatically attach the `X-CSRF-Protection: 1` header.
- Cookies are sent automatically with `credentials: "include"`.

---

## 4. Key Features: End-to-End Request Flows

### 1. Authentication Flow (JWT in HttpOnly Cookie)
- **Frontend Component**: [`src/pages/Auth.jsx`](file:///d:/STAYSPHERE/Staysphere/src/pages/Auth.jsx)
- **API Endpoint**: `POST /api/auth/login` or `POST /api/auth/register`
- **Controller**: `authController.login` / `register` in [`server/src/controllers/authController.js`](file:///d:/STAYSPHERE/Staysphere/server/src/controllers/authController.js)
- **Service**: [`server/src/services/authService.js`](file:///d:/STAYSPHERE/Staysphere/server/src/services/authService.js)
- **Mongoose Model**: [`server/src/models/User.js`](file:///d:/STAYSPHERE/Staysphere/server/src/models/User.js)
- **Flow**:
  1. User enters email and password.
  2. Server hashes password with bcrypt (12 rounds) or verifies password against hash.
  3. Server creates an encrypted JWT token (`HS256`, 7-day TTL).
  4. Server sends JWT inside a secure `staysphere_session` cookie (`httpOnly: true`, `sameSite: none`, `secure: true` in production). Client-side JS cannot steal the token via XSS.

### 2. Role-Based Access Control (RBAC)
- **Middleware**: `requireRole("HOST")` in [`server/src/middleware/auth.js`](file:///d:/STAYSPHERE/Staysphere/server/src/middleware/auth.js)
- **Flow**:
  1. Protected route receives request with cookie.
  2. `authenticate` middleware verifies JWT and attaches `req.user` (`GUEST` or `HOST`).
  3. `requireRole("HOST")` checks `req.user.role`. If `GUEST` attempts to create/edit properties, server returns `HTTP 403 Forbidden`.

### 3. Property Creation & Image Upload
- **Frontend Component**: [`src/pages/PropertyForm.jsx`](file:///d:/STAYSPHERE/Staysphere/src/pages/PropertyForm.jsx)
- **API Endpoint**: `POST /api/listings` (Multipart form-data)
- **Middleware**: Multer in [`server/src/middleware/upload.js`](file:///d:/STAYSPHERE/Staysphere/server/src/middleware/upload.js) uploads to Cloudinary (or local `/uploads` folder as fallback).
- **Controller**: `createListingController.create` in [`server/src/controllers/listingController.js`](file:///d:/STAYSPHERE/Staysphere/server/src/controllers/listingController.js)
- **Service**: `listingService.create` in [`server/src/services/listingService.js`](file:///d:/STAYSPHERE/Staysphere/server/src/services/listingService.js)
- **Mongoose Model**: [`server/src/models/Listing.js`](file:///d:/STAYSPHERE/Staysphere/server/src/models/Listing.js)
- **Flow**:
  1. Host submits property details and image files.
  2. Images are uploaded to Cloudinary or saved to `server/uploads/`.
  3. `embeddingService` extracts safe searchable text and generates a 768-dimensional Gemini embedding vector.
  4. Listing is saved in MongoDB Atlas with status `ACTIVE` and `embeddingStatus: "COMPLETED"`.

### 4. MongoDB Atlas Vector Search (Semantic Property Discovery)
- **Frontend Component**: [`src/pages/Explore.jsx`](file:///d:/STAYSPHERE/Staysphere/src/pages/Explore.jsx)
- **API Endpoint**: `GET /api/listings?search=...`
- **Service**: [`server/src/services/embeddingService.js`](file:///d:/STAYSPHERE/Staysphere/server/src/services/embeddingService.js)
- **Repository**: `listingRepository.search` & `vectorSearch` in [`server/src/repositories/listingRepository.js`](file:///d:/STAYSPHERE/Staysphere/server/src/repositories/listingRepository.js)
- **Flow**:
  1. Guest enters natural language query: *"peaceful cabin in the mountains"*.
  2. `embeddingService.generateEmbedding(query, "RETRIEVAL_QUERY")` calls Gemini API (`gemini-embedding-001`, `outputDimensionality: 768`).
  3. Server executes MongoDB aggregation with `$vectorSearch`:
     ```javascript
     {
       $vectorSearch: {
         index: "property_vector_index",
         path: "embedding",
         queryVector: [0.021, -0.054, ...],
         numCandidates: 100,
         limit: 12,
         filter: { status: { $eq: "ACTIVE" } }
       }
     }
     ```
  4. Atlas computes **Cosine Similarity** between query vector and listing vectors.
  5. Top ranked listings are returned with `similarityScore`. If index is absent or API is down, it smoothly falls back to B-tree regex keyword search.

### 5. AI Property Finder (Natural Language Filter Parsing)
- **Frontend Component**: [`src/pages/Guest.jsx`](file:///d:/STAYSPHERE/Staysphere/src/pages/Guest.jsx) (AI Finder tab)
- **API Endpoint**: `POST /api/ai/search`
- **Service**: [`server/src/services/aiService.js`](file:///d:/STAYSPHERE/Staysphere/server/src/services/aiService.js) + [`server/src/services/aiPrivacyService.js`](file:///d:/STAYSPHERE/Staysphere/server/src/services/aiPrivacyService.js)
- **Flow**:
  1. Guest inputs: *"Find me a villa in Goa under 6000 for 4 people with a pool"*.
  2. `aiPrivacyService.sanitizeSearchPrompt` scrubs any PII (emails, phone numbers, tokens).
  3. Gemini 1.5 Flash parses criteria into structured JSON:
     `{ city: "Goa", maxPrice: 6000, guests: 4, propertyType: "Villa", amenities: ["Pool"] }`.
  4. Server queries real MongoDB listings matching these constraints and returns actual grounded database results.

### 6. AI Description Generator
- **Frontend Component**: Button in [`src/pages/PropertyForm.jsx`](file:///d:/STAYSPHERE/Staysphere/src/pages/PropertyForm.jsx)
- **API Endpoint**: `POST /api/ai/description`
- **Service**: [`server/src/services/aiService.js`](file:///d:/STAYSPHERE/Staysphere/server/src/services/aiService.js)
- **Flow**:
  1. Host enters title, location, room count, and ticks amenities.
  2. Gemini drafts engaging, factual listing marketing copy based strictly on provided facts without hallucinating unselected amenities.
  3. Host can edit the draft before publishing.

### 7. Atomic Booking Engine & Double-Booking Prevention
- **Frontend Component**: [`src/pages/Property.jsx`](file:///d:/STAYSPHERE/Staysphere/src/pages/Property.jsx)
- **API Endpoint**: `POST /api/bookings`
- **Repository**: [`server/src/repositories/bookingRepository.js`](file:///d:/STAYSPHERE/Staysphere/server/src/repositories/bookingRepository.js)
- **Mongoose Models**: [`server/src/models/Booking.js`](file:///d:/STAYSPHERE/Staysphere/server/src/models/Booking.js) & [`server/src/models/BookingNight.js`](file:///d:/STAYSPHERE/Staysphere/server/src/models/BookingNight.js)
- **Flow**:
  1. Guest selects `checkIn` (e.g., `2026-12-01`) and `checkOut` (e.g., `2026-12-04`).
  2. Date math expands the range into individual night strings: `["2026-12-01", "2026-12-02", "2026-12-03"]`.
  3. Server checks host blocked ranges in `BlockedDate`.
  4. Server atomically attempts to insert each night into the `BookingNight` collection.
  5. `BookingNight` enforces a **unique compound index** on `{ listingId: 1, date: 1 }`.
  6. If two guests click "Book" simultaneously for the same night, MongoDB rejects the second insert with duplicate key error `E11000`. The server rolls back and returns `HTTP 409 Conflict`. Zero double-bookings possible.

---

## 5. Deployment Architecture

```
                  ┌───────────────────────────────┐
                  │    Vercel (Frontend Host)     │
                  │  - React 19 SPA (Vite dist)   │
                  │  - vercel.json SPA rewrites   │
                  └───────────────┬───────────────┘
                                  │ HTTPS
                                  ▼
                  ┌───────────────────────────────┐
                  │    Render (Backend API Host)  │
                  │  - Node.js 22 LTS / Express 5 │
                  │  - render.yaml Blueprint      │
                  │  - JWT Cookie (SameSite=None) │
                  └───────┬───────────────┬───────┘
                          │               │
                          ▼               ▼
         ┌─────────────────────┐   ┌────────────────────────┐
         │ MongoDB Atlas Cloud │   │   Google Gemini API    │
         │ - Database Cluster  │   │ - gemini-1.5-flash     │
         │ - $vectorSearch     │   │ - gemini-embedding-001 │
         └─────────────────────┘   └────────────────────────┘
```

---

## 6. Viva & Technical Interview Cheatsheet

| Question | Clear Answer to Give |
|----------|----------------------|
| **Why MERN stack?** | MongoDB stores dynamic JSON-like property documents; Express provides robust REST endpoints; React delivers responsive client-side UI with 3D canvas; Node.js handles async I/O efficiently. |
| **How does vector search differ from keyword search?** | Keyword search looks for exact character matches (`regex`). Vector search embeds words into a 768-dimensional geometric space where conceptual synonyms ("cottage", "cabin", "chalet") cluster together by cosine similarity. |
| **Why store JWT in an HttpOnly cookie instead of localStorage?** | `localStorage` is accessible to client JavaScript and vulnerable to Cross-Site Scripting (XSS) token theft. `HttpOnly` cookies cannot be read by JavaScript, protecting user sessions. |
| **How is race condition double-booking prevented?** | By decomposing date ranges into distinct nights and enforcing a MongoDB unique compound index `{ listingId: 1, date: 1 }` in the `BookingNight` collection. MongoDB handles atomic locking at the storage engine level. |
| **How is AI prompt injection prevented?** | All inputs pass through `aiPrivacyService` which enforces strict length limits, strips emails/phones/tokens, and validates extracted filters against strict canonical allowlists before touching MongoDB. |
