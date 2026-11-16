# Backend integration contract

Task 2 implements MongoDB-backed authentication and profiles in `server/`. The remaining property, favorite, availability, upload, and AI workflows are still browser-local mocks. Replace implementations in `src/services/index.js`; presentation code should consume the same `{data: ...}` promise responses. Reject errors with a useful `.message`. Use `VITE_API_BASE_URL` (default `/api`) in a centralized Fetch client with `credentials: 'include'`. Add real network loading/error handling to every mutating screen when migrating.

## Planned endpoints

| Service                              | Endpoint                                       | Request                                            | Response data                      |
| ------------------------------------ | ---------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| authService.login                    | POST /api/auth/login                           | {email,password}                                   | User                               |
| authService.signup                   | POST /api/auth/register                        | {name,email,password,role}                         | User                               |
| session                              | GET /api/auth/me                               | —                                                  | User or null                       |
| authService.logout                   | POST /api/auth/logout                          | —                                                  | null                               |
| authService.update                   | PATCH /api/auth/profile                        | {name,email}                                       | User                               |
| listingService.list                  | GET /api/listings                              | q,min,max,guests,bedrooms,type,amenities,sort,page | Listing[]; add pagination metadata |
| listingService.save                  | POST /api/listings or PATCH /api/listings/:id  | Listing input                                      | Listing                            |
| listingService.remove                | DELETE /api/listings/:id                       | —                                                  | id                                 |
| favoriteService.toggle               | PUT or DELETE /api/favorites/:listingId        | —                                                  | string[] listing IDs               |
| availabilityService.add              | POST /api/listings/:id/availability            | {start,end,reason}                                 | updated Listing                    |
| availabilityService.remove           | DELETE /api/listings/:id/availability/:blockId | —                                                  | id                                 |
| aiService.findPropertiesFromPrompt   | POST /api/ai/search                            | {prompt}                                           | {filters,properties:Listing[]}     |
| aiService.generateListingDescription | POST /api/ai/description                       | Listing input                                      | description string                 |
| Image service (future)               | POST /api/uploads/signature                    | {type,size}                                        | signed upload parameters           |

Error envelope: `{error:{code,message,fields?}}`. Fetch wrapper must convert non-2xx responses to rejected errors. Validation errors should attach to relevant fields.

## Data models

User: `{id,name,email,role:'GUEST'|'HOST'}`. Never return password hashes to the browser.

Listing: `{id,hostId,name,location,type,price,guests,bedrooms,bathrooms,amenities:string[],images:string[],description,highlights?,status:'active'|'draft',createdAt:number,blocks:AvailabilityBlock[]}`. Prices are integer INR per night. IDs remain stable strings. Add structured city/state coordinates server-side without breaking display location. Drafts are visible only to their owner.

AvailabilityBlock: `{id,start:'YYYY-MM-DD',end:'YYYY-MM-DD',reason:'Booked'|'Maintenance'|'Host Blocked'}`.

Filters: `{q?,min?,max?,guests?,bedrooms?,type?,amenities?:string[],sort?:'new'|'low'|'high'}`. Capacity and bedroom filters mean minimum capacity, not exact equality.

## Authentication and authorization — implemented

`src/services/apiClient.js` centralizes Fetch with `credentials: 'include'`, JSON/error handling, timeout, and `X-CSRF-Protection: 1` on mutations. `authService.js` stores only a current user DTO in memory; the context subscribes and restores via `/api/auth/me`. Old browser-local mock credentials are migrated away and demo account login is removed in all builds. Protected routes wait for session restoration; backend role middleware checks the current User in MongoDB, not client state.

The server uses Mongoose User documents with name, normalized unique email, passwordHash (select:false), GUEST/HOST role, optional avatar and timestamps. Passwords use bcrypt with 12 rounds. JWTs use HS256 with issuer/audience verification, user ID subject, and seven-day expiry. No token/hash is returned in response JSON. Auth data uses `{data:User}`; errors use `{error:{code,message}}`. `POST /auth/register` returns 201, login/me/profile return 200, and logout returns `{data:null}`. Invalid sessions/credentials return 401, forbidden roles 403, duplicate emails 409, validation errors 400, and auth throttling 429. Host authorization is exercised by `/api/auth/host-access` and must be reused for future listing mutation routes.

Production cookie: `staysphere_session`, HttpOnly, Secure, SameSite=None, Path=/, no Domain attribute. Development: SameSite=Lax, Secure=false. CORS allowlists exact `CLIENT_URL` origins, supports credentials, and rejects other origins. Mutations require a non-simple CSRF header; preflight is subject to the allowlist. Browser third-party-cookie policies may require custom same-site domains or a same-origin proxy. Logout clears the cookie; stateless JWTs have no revocation list in this MVP. Password reset and email verification are not implemented.

Active server variable names are `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV`, `PORT`; old `MONGODB_URI`/`CLIENT_ORIGIN` names are no longer used. The listener connects and initializes indexes before accepting requests. Set only the public `VITE_API_BASE_URL` in the frontend. See README for exact setup.

## Images

`PropertyForm.upload` currently validates JPEG/PNG/WebP, max 2 MB and 6 images, then reads data URLs. Replace this with a signed Cloudinary upload flow after server validation. Store final URL/public ID metadata rather than data URLs. Handle uploading/error/retry states and delete orphaned assets when appropriate. LocalStorage quota is intentionally a demo limitation.

## Calendar conventions

Intervals use date-only values in the property's local timezone, check-in-inclusive and check-out-exclusive: `[start,end)`. Never parse date-only strings through UTC for display. A range overlaps another if `start < other.end && end > other.start`. Adjacent ranges are valid. Require `start < end` and `start >= today` in the property timezone. Enforce concurrency-safe non-overlap server-side; client validation alone is insufficient. The calendar renders through end minus one day. Seed dates are relative to the first demo session and persist until reset. 'Booked' records are host availability annotations only, never reservations. There is no booking endpoint in this frontend.

## AI integration

Search currently uses deterministic parsing of known destinations, types, budget, guests, and amenity terms. Unknown intent asks for clarification; no invented results are created. At `/api/ai/search`, have the LLM emit schema-validated filters, validate against allowlists, then query MongoDB. Return only actual listing records. Description generation must ground text in validated host facts and never publish automatically. Keep generated descriptions editable. Add timeouts, rate limits, helpful errors, and no client LLM keys.

## Known mock limitations

Property/favorite/calendar data remains browser-local and resettable; auth/profile persistence is implemented, but there is no shared property persistence or real AI, no bookings, no payments, no map/geocoding, no email delivery, and simulated property views. User passwords and tokens are no longer stored in localStorage. Host charts are fixed simulated data and do not represent real traffic. External stock photos illustrate demo listings. Public favorites are local to this browser. Upload quota is browser-dependent. The availability service should eventually use transactions. Frontend API clients should replace direct context mutations for recent views and reset operations when backend integration begins.
