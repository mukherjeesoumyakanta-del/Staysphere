# StaySphere project status

## Repository and completed foundation

- Verified checkout `/workspace/sites/staysphere`, branch `main`, GitHub remote `github`: `https://github.com/mukherjeesoumyakanta-del/Staysphere.git`. `origin` is separate Sites source hosting.
- React/Vite/JavaScript frontend stays at root; modular Express backend is under `server/`. Cinematic homepage, dashboards, property screens, availability calendars and AI presentation are preserved.
- Task 1 completed: security middleware, health, config/errors, scripts, env ignores, Render blueprint and Vercel SPA routing.

## Task 2 — implemented

- Mongoose connection before HTTP startup and indexed User model: normalized unique email, bcrypt hash, role, avatar, timestamps. Index race errors return 409.
- Register/login/logout/me/profile routes; seven-day HS256 JWT in host-only HTTP-only cookies, secure SameSite=None in production and Lax locally. No plaintext password/hash/token is returned or stored in browser storage.
- Backend authentication and current-database-role enforcement; `/api/auth/host-access` tests host-only access. Mutations have CSRF-header protection, credential-aware exact-origin CORS, strict field validation, safe errors, and login/registration rate limits.
- Central frontend credentialed API client, real auth service, memory-only user context with `/me` restoration, loading/retry/error states, protected role routes, persistent profile UI, and logout feedback. Mock-auth services and login shortcuts removed; legacy localStorage user/account records scrubbed.
- Original guest/host UI remains. Non-auth property/AI/favorite/calendar data remains mocked until its tasks. Reset clears only local demo property data, not registered accounts.

## External configuration and current blockers

No `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, or server `.env` exists in this environment. No Atlas connection or real database persistence test has been executed. No production authentication deployment is claimed. The previously published static Sites frontend is not the newly configured Render API.

Manual setup:

1. Create an Atlas cluster/database user, allow the development/backend outbound IPs, and place its URI (including database name) only in ignored `server/.env` as `MONGO_URI`.
2. Generate at least 32 characters of random `JWT_SECRET` locally. Set `CLIENT_URL=http://localhost:5173` for dev, and an exact HTTPS Vercel origin for production. Active variable names replace Task 1's `MONGODB_URI` and `CLIENT_ORIGIN`.
3. Run `npm ci`, `npm run install:server`, configure the blank templates, then `npm run dev:server` and `npm run dev:client`. Backend now intentionally refuses to listen without DB/secret setup.
4. Deploy Render using `render.yaml` with MONGO_URI/JWT_SECRET/CLIENT_URL and NODE_ENV=production. In Vercel set VITE_API_BASE_URL to the Render HTTPS origin plus `/api`, rebuild, and verify real browser refresh/logout/profile/role flows.
5. For browsers blocking third-party cookies, use same-site custom domains or a same-origin API proxy; SameSite=None/CORS cannot override that browser policy.

Secrets stay server-side. Cloudinary/LLM configuration can wait. JWT revocation, refresh tokens, email verification and password reset are not part of this MVP. Logout clears the browser cookie; copied JWTs last until expiry.

## Outstanding backend tasks

- Persist listing CRUD/search, host ownership checks on real listing APIs, favorites, and calendar intervals in MongoDB.
- Multer/Cloudinary images and validated external LLM integrations.
- Replace remaining local demo state; retain date convention `[startDate,endDate)`.
- Atlas integration verification and real deployed browser QA, especially secure cookie persistence/third-party restrictions.
- No reservations, payments, checkout, refunds, Redis, or microservices.

## Executed verification

- `npm test`: 29 passing tests (11 frontend service tests; 18 backend tests). Includes guest/host register/login/logout, duplicate emails, incorrect passwords, missing/expired/tampered sessions, cookie replay, host authorization against current database roles, profile safety, CSRF, auth limits, Mongoose schema validation, and legacy localStorage migration.
- `npm run build`: passed, with the existing large lazy WebGL chunk warning.
- `npm --prefix server run check`: passed.
- Startup without MONGO_URI/JWT_SECRET: executed and verified to exit 1 before listening. This is configuration failure, not a successful database test.
- No real database or browser test ran; Atlas persistence and actual browser refresh/cross-domain cookie acceptance remain setup blockers. Supertest auth tests use real Express handlers, bcrypt and JWT with an injected in-memory user repository; schema validation uses Mongoose without a database. Cookie replay models refresh at the HTTP level, not in an actual browser. No Atlas or browser result is implied.
