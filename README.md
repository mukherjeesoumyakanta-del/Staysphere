# StaySphere

A React + Vite property discovery and management frontend, written in JavaScript/JSX. No backend is included.

## Run locally

Requires Node.js 20.19+ (Node 22 LTS recommended).

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
```

Deploy the `dist` directory to a static host with SPA fallback to `index.html`. Vite supports direct-route refresh in development. Sites static hosting uses its SPA fallback.

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
