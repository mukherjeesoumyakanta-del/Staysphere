# StaySphere — AI-Powered Property Discovery & Management Platform

[![StaySphere CI](https://github.com/mukherjeesoumyakanta-del/Staysphere/actions/workflows/ci.yml/badge.svg)](https://github.com/mukherjeesoumyakanta-del/Staysphere/actions/workflows/ci.yml)

StaySphere is a production-quality, full-stack MERN application with Google Gemini integration, 3D architectural storytelling, and atomic booking availability. Designed as a luxury property discovery experience inspired by high-end architectural SaaS platforms.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, GSAP ScrollTrigger, Three.js, React Three Fiber & Drei, Lucide React, Recharts, React Day Picker.
- **Backend**: Node.js 22 LTS, Express.js 5, Helmet, CORS, Cookie-Parser, Multer, Express-Rate-Limit, JsonWebToken, Bcrypt.
- **Database**: MongoDB Atlas with Mongoose ODM (unique compound indexes for atomic reservation locks).
- **Generative AI**: Google Gemini API (`gemini-1.5-flash`), with provider-agnostic fallback to OpenAI or local structured matching.
- **Image Storage**: Cloudinary with automatic local static uploads fallback.

---

## Key Features

1. **Cinematic Interactive Homepage**:
   - Scroll-driven procedural 3D villa created with Three.js geometry and Drei materials.
   - GSAP ScrollTrigger timelines coordinating camera navigation, image reveals, and destination showcases.
   - Responsive and accessible with automatic reduced-motion fallbacks.
2. **Real Property Discovery & Search**:
   - Real MongoDB-backed property catalog with multi-facet filters: destination, budget, property type, capacity, bedrooms, amenities, and sorting.
   - Rich detail pages with responsive image galleries, host details, and availability calendars.
3. **Dual GenAI Features (Grounded in MongoDB)**:
   - **AI Property Finder (`POST /api/ai/search`)**: Natural language search powered by Gemini. Extracts structured filters, sanitizes queries, and returns real active database listings.
   - **AI Description Generator (`POST /api/ai/description`)**: Generates factual, engaging listing copy for hosts based strictly on provided property specifications without inventing amenities.
4. **Authentication & Role-Based Security**:
   - Dedicated `GUEST` and `HOST` roles with server-enforced access guards.
   - Signed JWTs stored in `HttpOnly`, `Secure`, `SameSite: None` cookies.
   - Custom `X-CSRF-Protection: 1` headers on mutating requests.
   - Demo 1-Click login buttons on `/auth` for instant evaluator demonstration.
5. **Atomic Booking & Availability Engine**:
   - Double-booking prevention via MongoDB `BookingNight` compound unique indexes.
   - End-exclusive date interval math: `[checkIn, checkOut)`.
   - Host calendar block management and real-time availability checking.

---

## Folder Structure

```
staysphere/
├── public/                 # Static videos, hero poster, favicon
├── server/                 # Express.js Backend API
│   ├── src/
│   │   ├── config/         # Database, Cloudinary, Environment config
│   │   ├── controllers/    # Route controllers (Auth, Listing, Booking, AI, Availability)
│   │   ├── middleware/     # Auth guards, Multer uploads, CSRF, error handling
│   │   ├── models/         # Mongoose schemas (User, Listing, Booking, BlockedDate, etc.)
│   │   ├── repositories/   # Direct database access layer
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Core business logic & Gemini AI provider adapter
│   │   ├── app.js          # Express app factory (isolated for testing)
│   │   └── server.js       # Production listener & graceful shutdown
│   ├── test/               # 52 automated Node test runner integration tests
│   └── package.json
├── src/                    # React Frontend
│   ├── components/         # Reusable UI, Layout, Calendar, 3D Canvas, Analytics
│   │   └── cinematic/      # GSAP ScrollTrigger & Three.js VillaScene components
│   ├── context/            # Global Store (Auth session, Favorites, Listings cache)
│   ├── data/               # Seed data, types, amenities catalog
│   ├── pages/              # Route pages (Home, Explore, Property, Auth, Host, Guest)
│   ├── services/           # Centralized API fetch client & client-side adapters
│   ├── App.jsx             # React Router configuration
│   └── styles.css          # Core design system & responsive styling
├── vercel.json             # Vercel SPA routing & proxy configuration
├── render.yaml             # Render Blueprint web service configuration
├── DEPLOYMENT.md           # Step-by-step production deployment guide
├── ARCHITECTURE.md         # Deep-dive system design & data flow document
├── PROJECT_STATUS.md       # Audit matrix & verified test results
└── package.json
```

---

## Local Installation & Setup

### Prerequisites
- Node.js 22 LTS or newer
- MongoDB Atlas database cluster (or local MongoDB)

### 1. Clone & Install Dependencies
```sh
git clone https://github.com/mukherjeesoumyakanta-del/Staysphere.git
cd Staysphere

# Install frontend and server dependencies
npm install
npm run install:server
```

### 2. Configure Environment Variables
Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-random-32-character-secret-key-goes-here
AI_PROVIDER=gemini
AI_MODEL=gemini-1.5-flash
AI_API_KEY=your-google-gemini-api-key
```

### 3. Run Development Server
Start both the Express API server (port 5000) and the Vite frontend (port 5173) with a single command:
```sh
npm run dev
```
Or run individually in separate terminals:
```sh
# Terminal 1: Backend Express API
npm run dev:server

# Terminal 2: Frontend Vite
npm run dev:client
```
Visit `http://localhost:5173` in your browser.

---

## Continuous Integration (GitHub Actions)

StaySphere includes a streamlined GitHub Actions workflow (`.github/workflows/ci.yml`) triggered on every push and pull request to `main`:

1. **Environment Setup**: Provisions Node.js 22 LTS with dual lockfile caching (`package-lock.json` and `server/package-lock.json`).
2. **Clean Installs**: Executes `npm ci` for root and `npm --prefix server ci` for backend dependencies.
3. **Automated Testing**:
   - Executes 11 frontend unit tests (`npm run test:client`).
   - Executes 61 backend integration, privacy gateway, security, and latency tests (`npm run test:server`).
   - All tests run hermetically with mocked LLM clients — zero production secrets required in CI.
4. **Build Verification**: Runs `npm run build` to guarantee clean Vite bundling.
5. **Security Guard**: Enforces `permissions: contents: read` (least-privilege). Any failing test halts execution and blocks pull request merges.

---

## Automated Test Suites

Run both client and server test suites:
```sh
npm test
```

Or run individually:
```sh
# Frontend unit tests (11 tests)
npm run test:client

# Backend integration tests (52 tests)
npm run test:server
```

---

## Demonstration Workflow

1. **Homepage**: Experience the cinematic Three.js architectural villa that navigates with scroll position.
2. **Search**: Search for `"Goa"` or filter by price and villa type in `/explore`.
3. **AI Finder**:
   - Go to `/guest/ai-finder`.
   - Ask: `"Find me a villa in Goa under ₹6,000 for 4 guests"`.
   - Gemini parses the criteria and returns real MongoDB properties.
4. **Host Listing Creation**:
   - Click **1-Click Demo Host Login** on `/auth` (or register as a new host).
   - Go to **My Listings** → **Add a property**.
   - Fill in details, tick amenities (WiFi, Pool), click **Generate with AI** to create a grounded description, and upload images.
   - Click **Publish listing**.
5. **Guest Booking**:
   - Click **Sign out** in the navbar, then click **1-Click Demo Guest Login**.
   - Open the newly published property.
   - Pick check-in and checkout dates on the interactive calendar.
   - Click **Book Now**. The reservation is instantly confirmed and dates are locked atomically.

---

## Production Deployment

Detailed production deployment instructions for **Vercel** (Frontend) and **Render** (Backend) are available in [DEPLOYMENT.md](file:///d:/STAYSPHERE/Staysphere/DEPLOYMENT.md).

Architecture details and system design patterns are documented in [ARCHITECTURE.md](file:///d:/STAYSPHERE/Staysphere/ARCHITECTURE.md).
Current feature completion matrix is in [PROJECT_STATUS.md](file:///d:/STAYSPHERE/Staysphere/PROJECT_STATUS.md).
