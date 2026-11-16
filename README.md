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
