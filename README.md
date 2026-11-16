# StaySphere

A React + Vite property discovery and management frontend with a modular Express API foundation. The UI remains mock-backed in Task 1; the server currently exposes a liveness endpoint only.

## Run locally

Use Node.js 22 LTS or newer. Keep the existing frontend at the repository root and the API in `server/`; no client move is necessary.

```sh
npm ci
npm run install:server
cp .env.example .env
cp server/.env.example server/.env
```

The blank templates contain variable names only. Defaults work locally without secrets: API port 5000 and frontend origin http://localhost:5173. In separate terminals:

```sh
npm run dev:client
npm run dev:server
```

`npm run dev` is still the original frontend command. Vite proxies `/api` to http://127.0.0.1:5000; if you change the API port, update that development proxy too. The current UI deliberately continues using mock services until later tasks.

```sh
curl -i http://localhost:5000/api/health
npm test                 # frontend + backend suites
npm run build           # frontend production build
npm --prefix server run check
npm run start:server    # production-style API start
```

Health responds HTTP 200 with `{ "data": { "status": "ok", "service": "staysphere-api" } }`. It checks HTTP liveness, not MongoDB connectivity. An app factory is separate from the listener for testing. The API uses Helmet, credential-aware origin allowlisting, request rate limiting, a 100 KB JSON limit, cookie parsing, and centralized sanitized errors. No login, database, uploads, or AI endpoints exist yet.

## Deployment preparation

**Render API:** use `render.yaml` as a Blueprint, or create a Node web service with root directory `server`, build command `npm ci --omit=dev`, start command `npm start`, and health path `/api/health`. Set `NODE_ENV=production` and `CLIENT_ORIGIN` to the exact frontend origin, for example your Vercel HTTPS origin, without a trailing slash. Multiple approved origins may be comma-separated. Render supplies `PORT`; the server listens on `0.0.0.0` and shuts down gracefully on SIGTERM. No external database credential is needed for Task 1 health.

**Vercel frontend:** import the verified GitHub repo, choose Vite, keep root directory at repository root, build with `npm run build`, and publish `dist`. `vercel.json` provides SPA routing for direct route refresh. In later tasks, set public `VITE_API_BASE_URL` to the Render API origin plus `/api`; never use VITE-prefixed variables for secrets. Existing Sites hosting is preserved in `.openai/hosting.json` and is separate from Render/Vercel. This task does not provision or deploy external infrastructure.

Cross-site HTTP-only cookie attributes, CSRF protection, and production domain choices must be finalized when real authentication is added. All frontend role guards and credentials below are currently demo-only.

## Demo accounts

- Guest: `guest@staysphere.demo`
- Host: `host@staysphere.demo`
- Both passwords: `Demo123!`

Use the one-click demo account buttons on `/login`, or create a local demo account. Authentication is frontend simulation, not security. Never enter a real password. Local demo credentials and state live in localStorage. Profile → Reset demo data clears everything.

## Included experiences

Public home, explore, property details, about, login, signup, 404; guarded guest dashboard, favorites, mock AI finder, profile; guarded host analytics dashboard, listing CRUD, local image previews, description generation, and availability management. All pages consume the same 12-property demo dataset through shared services. Favorites may also be saved before login on the same browser.

React Router, Tailwind CSS, Framer Motion, Lucide, React Day Picker, Recharts, and lazy-loaded React Three Fiber/Drei are used. The architectural scene falls back to photography when WebGL is unavailable or reduced motion is requested. Property photographs are illustrative Unsplash assets, not photos of real advertised Indian rentals; fonts load from Google Fonts. Internet access is needed for these assets.

## Source map

- `src/data`: centralized properties, amenity/type vocabulary, relative availability dates
- `src/services`: promise-based mock API boundaries, search parsing, interval validation, tests
- `src/context`: shared session and application state
- `src/components`: public/dashboard layouts, property cards, calendar, 3D, analytics, UI
- `src/pages`: route screens and reusable listing form

Configure `VITE_API_BASE_URL` for future backend work. See BACKEND_INTEGRATION.md. There is no checkout, booking creation, payment gateway, real authentication, or LLM integration.

## Verification

Production build and Node service tests cover authentication roles, filtering, grounded mock AI, favorites, listing CRUD, and end-exclusive calendar overlap rules. Browser UI, console, and device testing were not available in the build environment; verify these manually before a recruiter demo. Local image storage is limited by browser quota (typically 5–10 MB); keep images small.

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
