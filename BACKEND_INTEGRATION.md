# Backend integration contract

The current application is entirely client-side. Replace implementations in `src/services/index.js`; presentation code should consume the same `{data: ...}` promise responses. Reject errors with a useful `.message`. Use `VITE_API_BASE_URL` (default `/api`) in a centralized Fetch client with `credentials: 'include'`. Add real network loading/error handling to every mutating screen when migrating.

## Planned endpoints

| Service                              | Endpoint                                       | Request                                            | Response data                      |
| ------------------------------------ | ---------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| authService.login                    | POST /api/auth/login                           | {email,password}                                   | User                               |
| authService.signup                   | POST /api/auth/signup                          | {name,email,password,role}                         | User                               |
| session                              | GET /api/auth/me                               | —                                                  | User or null                       |
| authService.logout                   | POST /api/auth/logout                          | —                                                  | null                               |
| authService.update                   | PATCH /api/users/me                            | {name,email}                                       | User                               |
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

## Authentication and authorization

Replace localStorage accounts with Express sessions using JWT in secure HTTP-only cookies (or a secure server session). Add CSRF protection, server-side role enforcement, owner checks, rate limits, password hashing, and signup/login validation. React route guards are presentation only. Initialize session through `/auth/me`. Do not store real credentials or access tokens in localStorage. The current demo profile update updates the mock session; persisted account records are not an identity system.

## Images

`PropertyForm.upload` currently validates JPEG/PNG/WebP, max 2 MB and 6 images, then reads data URLs. Replace this with a signed Cloudinary upload flow after server validation. Store final URL/public ID metadata rather than data URLs. Handle uploading/error/retry states and delete orphaned assets when appropriate. LocalStorage quota is intentionally a demo limitation.

## Calendar conventions

Intervals use date-only values in the property's local timezone, check-in-inclusive and check-out-exclusive: `[start,end)`. Never parse date-only strings through UTC for display. A range overlaps another if `start < other.end && end > other.start`. Adjacent ranges are valid. Require `start < end` and `start >= today` in the property timezone. Enforce concurrency-safe non-overlap server-side; client validation alone is insufficient. The calendar renders through end minus one day. Seed dates are relative to the first demo session and persist until reset. 'Booked' records are host availability annotations only, never reservations. There is no booking endpoint in this frontend.

## AI integration

Search currently uses deterministic parsing of known destinations, types, budget, guests, and amenity terms. Unknown intent asks for clarification; no invented results are created. At `/api/ai/search`, have the LLM emit schema-validated filters, validate against allowlists, then query MongoDB. Return only actual listing records. Description generation must ground text in validated host facts and never publish automatically. Keep generated descriptions editable. Add timeouts, rate limits, helpful errors, and no client LLM keys.

## Known mock limitations

All data is browser-local and resettable, no shared multi-user persistence, no production access control, no real AI, no bookings, no payments, no map/geocoding, no email delivery, and simulated property views. Signup passwords are plain demo values in localStorage: never reuse real credentials. Host charts are fixed simulated data and do not represent real traffic. External stock photos illustrate demo listings. Public favorites are local to this browser. Upload quota is browser-dependent. The availability service should eventually use transactions. Frontend API clients should replace direct context mutations for recent views and reset operations when backend integration begins.
