# StaySphere

A React + Vite property discovery and management frontend with a modular Express API foundation. Authentication and profiles now use a MongoDB-backed Express API. Property CRUD, favorites, calendars, and AI remain mock-backed pending their backend tasks.

## Run locally

Use Node.js 22 LTS or newer. Keep the existing frontend at the repository root and the API in `server/`; no client move is necessary.

```sh
npm ci
npm run install:server
cp .env.example .env
cp server/.env.example server/.env
```

The blank templates contain variable names only. Before starting, configure ignored `server/.env` with `MONGO_URI`, a random `JWT_SECRET` of at least 32 characters, and `CLIENT_URL=http://localhost:5173`. `NODE_ENV=development` and `PORT=5000` are local defaults. No account secrets belong in the root frontend `.env`. In separate terminals:

```sh
npm run dev:client
npm run dev:server
```

`npm run dev` is still the original frontend command. Vite proxies `/api` to http://127.0.0.1:5000; if you change the API port, update that development proxy too. Auth uses the HTTP API now; non-auth product services remain mocked.

```sh
curl -i http://localhost:5000/api/health
npm test                 # frontend + backend suites
npm run build           # frontend production build
npm --prefix server run check
npm run start:server    # production-style API start
```

The server connects to MongoDB and initializes the unique user email index before listening. Missing configuration or failed connection stops startup. Once running, health responds HTTP 200 with `{ "data": { "status": "ok", "service": "staysphere-api" } }`; health is liveness rather than a continuous database-readiness probe. An app factory is separate from the listener for testing. The API uses Helmet, credential-aware origin allowlisting, request rate limiting, a 100 KB JSON limit, cookie parsing, and centralized sanitized errors. Authentication and profile endpoints are implemented; listing/upload/AI persistence endpoints are not.

## Deployment preparation

**Render API:** use `render.yaml` as a Blueprint, or create a Node web service with root directory `server`, build command `npm ci --omit=dev`, start command `npm start`, and health path `/api/health`. Set `NODE_ENV=production` and `CLIENT_URL` to the exact frontend origin, for example your Vercel HTTPS origin, without a trailing slash. Multiple approved origins may be comma-separated. Render supplies `PORT`; the server listens on `0.0.0.0` and shuts down gracefully on SIGTERM. Set `MONGO_URI` and `JWT_SECRET` in Render; startup now requires both.

**Vercel frontend:** import the verified GitHub repo, choose Vite, keep root directory at repository root, build with `npm run build`, and publish `dist`. `vercel.json` provides SPA routing for direct route refresh. Set public `VITE_API_BASE_URL` to the Render API origin plus `/api`; never use VITE-prefixed variables for secrets. Existing Sites hosting is preserved in `.openai/hosting.json` and is separate from Render/Vercel. This task does not provision or deploy external infrastructure.

Production cookies are host-only, HTTP-only, Secure, SameSite=None, path `/`, with seven-day expiry. Local development uses SameSite=Lax without Secure. All unsafe auth requests require `X-CSRF-Protection: 1`; the centralized client sends this and `credentials: include`. Only exact configured origins receive credentialed CORS responses.

## Real accounts and session behavior

Register at `/signup` as a guest or host, then sign in with the same email/password. There are no demo account shortcuts or seeded login credentials. The API stores bcrypt password hashes, not plaintext passwords. JWTs remain exclusively in an HTTP-only cookie. The React session is in memory and restored from `/api/auth/me` after refresh; guards wait for restoration, and network failures offer retry. Legacy mock accounts/user records are removed from browser storage. Logout clears the cookie and frontend session; profile updates persist in MongoDB. Local demo data reset does not delete the account or log out.

Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/profile`. `GET /api/auth/host-access` demonstrates backend host-role enforcement. Authorization reads the current database role; client roles and JWT role claims are not trusted. Tokens are not returned in JSON. Login and registration share a 20-attempt / 15-minute per-IP limit. Passwords must be at least 8 characters and no more than 72 UTF-8 bytes (bcrypt limit). Registration and profile update handle MongoDB unique-index races safely.

### Required external setup

1. Create an Atlas cluster and database user; allow the development machine/backend host's outbound IPs in Atlas network access. Copy its connection string into ignored `server/.env` as `MONGO_URI`, including a database name. Never paste credentials into chat or Git.
2. Generate a random JWT secret locally, e.g. `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Store it as `JWT_SECRET` in `server/.env` and later Render's server environment, never in Vercel frontend variables.
3. For local development set `CLIENT_URL=http://localhost:5173`. For Render set `NODE_ENV=production`, `CLIENT_URL` to the exact HTTPS Vercel origin (no trailing slash), and the server secrets. Render supplies `PORT`.
4. In Vercel set `VITE_API_BASE_URL` to your HTTPS Render origin plus `/api`, then rebuild/redeploy. Do not place JWT, database, Cloudinary, or LLM keys in `VITE_*` variables. Verify registration, refresh, role redirects, profile update, and logout in the deployed browser.

Some browsers block third-party cookies between unrelated Vercel/Render domains even with SameSite=None. If your target browsers block them, use same-site custom domains such as `app.example.com` / `api.example.com`, or a same-origin API proxy. Then update `CLIENT_URL` and `VITE_API_BASE_URL` accordingly and retest. CORS cannot override browser third-party-cookie blocking.

Logout clears the browser cookie; this MVP has no server-side JWT revocation list, so a previously copied token remains valid until expiry. Logout-all-devices and refresh tokens are outside this task. No email verification or password reset is required.

## Included experiences

Public home, explore, property details, about, login, signup, 404; guarded guest dashboard, favorites, mock AI finder, profile; guarded host analytics dashboard, listing CRUD, local image previews, description generation, and availability management. Property screens consume the same 12-property demo dataset through shared services. Favorites may also be saved before login on the same browser.

React Router, Tailwind CSS, Framer Motion, Lucide, React Day Picker, Recharts, and lazy-loaded React Three Fiber/Drei are used. The architectural scene falls back to photography when WebGL is unavailable or reduced motion is requested. Property photographs are illustrative Unsplash assets, not photos of real advertised Indian rentals; fonts load from Google Fonts. Internet access is needed for these assets.

## Source map

- `src/data`: centralized properties, amenity/type vocabulary, relative availability dates
- `src/services`: promise-based mock API boundaries, search parsing, interval validation, tests
- `src/context`: shared session and application state
- `src/components`: public/dashboard layouts, property cards, calendar, 3D, analytics, UI
- `src/pages`: route screens and reusable listing form

Configure `VITE_API_BASE_URL` for future backend work. See BACKEND_INTEGRATION.md. There is no checkout, booking creation, payment gateway, or live LLM integration.

## Verification

Production build and Node service tests cover filtering, grounded mock AI, favorites, listing CRUD, end-exclusive intervals, auth HTTP flows, bcrypt, JWT cookies, server roles, validation, CSRF and rate limiting. Auth tests inject an in-memory user repository into the real routes/controllers/service and validate the Mongoose schema without a database. No Atlas connection, actual MongoDB persistence, browser refresh, or deployed cross-domain cookie result is claimed without external setup. Browser UI, console, and device testing were not available in the build environment; verify these manually before a recruiter demo. Local image storage is limited by browser quota (typically 5–10 MB); keep images small.

## Cinematic homepage

GSAP ScrollTrigger now coordinates six modular sections in `src/components/cinematic/`:

- `CinematicHero`: local autoplay/muted/inline villa footage, poster, staggered headline, scroll parallax, working search.
- `ScrollDrivenHouse` / `VillaScene`: original procedural luxury villa (Three.js geometry + Drei RoundedBox), direct GSAP animation of object rotation and camera position. Desktop pin is 280vh; backward scrolling reverses the timeline. No GLB download or model license is needed.
- `PropertyReveal`: scrubbed image expansion through clip-path and scale.
- `DestinationShowcase`: desktop pinned crossfades and masked transitions across Goa, Manali, Darjeeling, Jaipur. Mobile and reduced-motion modes show a normal vertical sequence.
- `CinematicAISection`: dark emerald transition, typed mock prompt, matching result drawn from the shared listing data, and real AI Finder navigation.
- `HostingCTA`: locally bundled architectural video with a working host link.

Animation setup is scoped with GSAP contexts and matchMedia, with cleanup on unmount. WebGL is dynamically imported near the section, renders on demand, uses capped DPR, and stops rendering when scroll updates stop. Mobile avoids desktop pins. Reduced motion disables video playback and WebGL and keeps static content accessible. Videos pause offscreen or when the tab is hidden; data-saving connections receive the poster. The same 700 KB video is reused for hero and hosting and is browser-cacheable. Full 3D and video are in separate sections.

### Video provenance and missing attachment

`public/videos/architecture.mp4` is an optimized, silent 720×1280 derivative of the user-supplied `16868083_2160_3840_30fps.mp4` (6.34 seconds). The matching `public/images/hero-poster.webp` was extracted from it. Only the approximately 700 KB derivative is committed; the original 12 MB file stays outside the repository. `villa-fallback.webp` is optimized illustrative Unsplash photography. Destination photographs use Unsplash URLs.

The second supplied file, `16505759_3840_2160_60fps.mp4`, exceeded the file-transfer tool's 32 MiB limit and could not be inspected or included. No broken reference is created. To use it separately for hosting, provide a smaller licensed version (ideally 1080p, silent H.264 MP4, faststart, under 5 MB), put it in `public/videos/`, and add a `src` prop to BackgroundVideo. No additional model asset is required. The Pexels search page is a discovery link, not a video asset URL.

### Cinematic verification

Build and service tests are automated. The required `cua_repl.js` browser integration is unavailable in this environment, so actual playback, WebGL rendering, forward/backward camera movement, pin/unpin, mobile overflow, and reduced-motion appearance need manual browser verification. Check `/` at 1440px and 390px widths, scroll fully down and back up, follow a property and destination link, enter each demo dashboard, and repeat with reduced motion enabled. Confirm posters remain visible if autoplay/WebGL is blocked. No backend, calendar, mock authentication, or AI service behavior was changed.

### Editorial motion update

The public film now opens with an aperture cut and perspective typography, then moves through the villa's warm-to-daylight lighting change, a pinned `BE / LONG` typographic zoom-through, and a horizontal property contact sheet. Destinations use full-frame lateral wipes with counter-moving images and kinetic titles. The contact sheet becomes a native swipe gallery on mobile and for reduced motion; keyboard focus reveals offscreen cards on desktop. Clicking a public property image uses the browser View Transitions API for a shared-image transition when supported and falls back to normal navigation elsewhere. All GSAP sequences remain scoped and cleaned up. Services and dashboard code are unchanged. Browser validation remains unavailable in this environment; check the new cuts, horizontal pin/unpin, shared image, touch scrolling, keyboard focus, and reduced-motion mode manually.
