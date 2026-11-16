# StaySphere — Production Deployment Guide

This guide covers deploying StaySphere to **Render** (Backend API) and **Vercel** (Frontend SPA), connected to **MongoDB Atlas**, **Google Gemini**, and optionally **Cloudinary**.

---

## Architecture Overview

```
[Browser: Desktop / Mobile]
       │
       ├─── https://staysphere-app.vercel.app (Vercel Frontend)
       │         │
       │         ├── Direct Cross-Origin API calls (with credentials)
       │         └── OR Same-Origin Proxy: /api/* -> https://staysphere-api.onrender.com/api/*
       │
       └─── https://staysphere-api.onrender.com (Render Express API)
                 │
                 ├── MongoDB Atlas (Database: Users, Listings, Bookings, Blocks, Favorites)
                 ├── Google Gemini API (Grounded AI Search & AI Description Generator)
                 └── Cloudinary / Local Uploads (/uploads static storage)
```

---

## 1. MongoDB Atlas Setup

1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. In **Security → Database Access**, create a user (e.g. `staysphere_user`) with Read and Write permissions.
3. In **Security → Network Access**, add IP Access:
   - Click **Add IP Address** → choose **Allow Access From Anywhere** (`0.0.0.0/0`) so Render and local development can connect.
4. In **Deployments → Databases**, click **Connect** → **Drivers** (Node.js).
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/staysphere?retryWrites=true&w=majority
   ```
   *(Replace `<username>`, `<password>`, and ensure database name is specified, e.g. `staysphere`)*.

---

## 2. Backend Deployment on Render

### Method A: Using `render.yaml` Blueprint (Recommended)

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository: `mukherjeesoumyakanta-del/Staysphere`.
4. Render will read `render.yaml` automatically.
5. Fill in the required environment variables when prompted:
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A random 32+ character secret string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   - `CLIENT_URL`: `https://<your-vercel-app>.vercel.app` (comma-separated if multiple origins).
   - `AI_API_KEY`: Your Google Gemini API key.
   - `AI_PROVIDER`: `gemini`
   - `AI_MODEL`: `gemini-1.5-flash`
6. Click **Apply**.

### Method B: Manual Web Service

1. On the Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository: `mukherjeesoumyakanta-del/Staysphere`.
3. Configure the following fields:
   - **Name**: `staysphere-api`
   - **Region**: Oregon (US West) or Singapore / Frankfurt (closest to your users)
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm ci --omit=dev`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
   - **Health Check Path**: `/api/health`
4. In **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production cookie and proxy handling |
   | `PORT` | `5000` | Port for Express listener |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | Allowed CORS origin (NO trailing slash) |
   | `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas URI |
   | `JWT_SECRET` | *(64-char hex)* | JWT signing secret (min 32 chars) |
   | `AI_PROVIDER` | `gemini` | `gemini` (default) or `openai` |
   | `AI_MODEL` | `gemini-1.5-flash` | Free-tier Gemini model |
   | `AI_API_KEY` | *(your Gemini API key)* | Server-side Gemini API key |
   | `CLOUDINARY_CLOUD_NAME` | *(optional)* | Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | *(optional)* | Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | *(optional)* | Cloudinary API secret |
5. Click **Create Web Service**.
6. Once deployed, test the health check:
   ```sh
   curl https://<your-render-service>.onrender.com/api/health
   # Returns: {"data":{"status":"ok","service":"staysphere-api"}}
   ```

---

## 3. Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New…** → **Project**.
3. Import your GitHub repository: `mukherjeesoumyakanta-del/Staysphere`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (or `Staysphere` if deploying from the subfolder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. In **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://<your-render-service>.onrender.com/api` | Live backend API URL |
6. Click **Deploy**.
7. Once Vercel finishes building, note your live Vercel URL (e.g. `https://staysphere-app.vercel.app`).
8. Return to your **Render Web Service** → **Environment** and verify `CLIENT_URL` matches your exact Vercel URL without a trailing slash (e.g. `https://staysphere-app.vercel.app`).

---

## 4. Cross-Domain Cookie & CORS Configuration

StaySphere supports two production architectures:

### Architecture A: Direct Cross-Domain with Secure Cookies (Default)

- Frontend at `https://staysphere-app.vercel.app`
- Backend at `https://staysphere-api.onrender.com`
- When `NODE_ENV=production`:
  - `cookieOptions` in `server/src/middleware/auth.js` sets:
    - `httpOnly: true` (prevents XSS token theft)
    - `secure: true` (enforces HTTPS)
    - `sameSite: "none"` (allows cross-site requests with credentials)
    - `path: "/"`
  - `CORS` responds with `Access-Control-Allow-Origin: https://staysphere-app.vercel.app` and `Access-Control-Allow-Credentials: true`.
  - Frontend `apiClient.js` sends `credentials: "include"` and `X-CSRF-Protection: 1`.

### Architecture B: Same-Origin API Proxy (via Vercel Rewrites)

To bypass aggressive third-party cookie restrictions in Safari / iOS / Chrome Incognito:
1. Update `vercel.json` in the frontend:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [
       {
         "source": "/api/:match*",
         "destination": "https://<your-render-service>.onrender.com/api/:match*"
       },
       {
         "source": "/uploads/:match*",
         "destination": "https://<your-render-service>.onrender.com/uploads/:match*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
2. Remove `VITE_API_URL` in Vercel (or set to `/api`).
3. Now all browser requests go to `https://staysphere-app.vercel.app/api/...`, making auth cookies **1st-party same-site cookies**.

---

## 5. Seed Initial Database Properties (Optional)

To populate MongoDB Atlas with initial active properties:
```sh
cd server
MONGO_URI="your-mongodb-atlas-uri" npm run seed
```
This inserts high-quality verified property listings across Goa, Manali, Jaipur, Kerala, Darjeeling, Coorg, Rishikesh, Udaipur, Ladakh, and Ooty.

---

## 6. Verification Checklist

- [ ] **Health Endpoint**: `curl https://<render-url>/api/health` returns HTTP 200 with `status: ok`.
- [ ] **Explore Stays**: `https://<vercel-url>/explore` renders real MongoDB listings with images.
- [ ] **Host Registration**: Register a host account at `/signup`, verify auto-redirect to `/host/dashboard`.
- [ ] **Property Creation**: Navigate to `/host/listings/new`, upload images, click "Publish listing", confirm listing appears under `/host/listings`.
- [ ] **Property Detail**: Open the created listing at `/property/:id`, confirm specs, image gallery, and calendar load.
- [ ] **AI Property Finder**: Navigate to `/guest/ai-finder`, type `"villa in Goa"`, confirm grounded database results returned from Gemini.
- [ ] **AI Description Generator**: In property creation/edit, click "Generate with AI" to generate grounded description.
- [ ] **Guest Booking**: Sign in as guest, select dates on `/property/:id`, click "Book Now", verify dates are marked "Booked" on the calendar and in database.
- [ ] **Logout & Session Restoration**: Refresh page while logged in (session restores automatically); click "Sign out" (cookie clears cleanly).
- [ ] **Responsive Test**: Inspect at 360px (mobile), 768px (tablet), and 1440px (desktop) without horizontal scrollbar or navigation collision.

---

## 7. Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `503 Service Unavailable` on Render | Cold start on free tier | Render free tier spins down after 15 min of inactivity. First request takes ~30-50s to wake up. |
| `403 ORIGIN_NOT_ALLOWED` | `CLIENT_URL` mismatch | Ensure `CLIENT_URL` on Render exactly matches your Vercel URL (e.g. `https://staysphere.vercel.app`, no trailing slash). |
| Session lost on page refresh | Cookie blocked | Ensure `NODE_ENV=production` on Render, and frontend uses HTTPS. For strict browser privacy modes, use Architecture B (Vercel rewrite proxy). |
| `Image uploads are not configured` | Missing Cloudinary | Built-in fallback saves locally to `/uploads`. For persistent CDN uploads across Render restarts, provide `CLOUDINARY_*` keys. |
| `AI Service fallback` | Missing or invalid Gemini key | Check `AI_API_KEY` on Render. System gracefully falls back to structured keyword matching if API key is invalid or quota-limited. |
| Nested routes 404 on refresh | Missing SPA rewrites | Verify `vercel.json` has `{ "source": "/(.*)", "destination": "/index.html" }`. |
