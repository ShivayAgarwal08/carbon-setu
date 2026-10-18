# CARbon Setu (कार्बन सेतु) — Setup & API Guide
**Comprehensive Architecture, Environment, Multi-Modal Integrations & Production Guide**

---

## 1. Plain-English Architecture Overview

CARbon Setu is an evidence-grounded, multilingual Indian government welfare scheme matcher, application prefiller, and RTI assistant. It helps citizens—especially rural and digitally underserved communities—discover schemes, verify statutory eligibility against official rules, prepare prefilled applications, track action plans, and draft Right to Information (RTI) requests and First Appeals.

```
┌─────────────────────────────────┐      HTTPS / REST      ┌─────────────────────────────────┐      SQL Queries      ┌─────────────────────────────────┐
│         Citizen Client          │ ─────────────────────> │         Render Backend          │ ────────────────────> │         Neon PostgreSQL         │
│   (Vercel SPA: React 19)        │ <───────────────────── │       (Node.js + Express)       │ <──────────────────── │       Serverless Database       │
│  Bilingual Voice & Text Input   │      Secure Cookies    │      TypeScript + Prisma        │                       │  Users, Schemes, RTI, Profiles  │
└─────────────────────────────────┘                        └───────────────┬─────────────────┘                       └─────────────────────────────────┘
                                                                           │
                       ┌───────────────────────────────────────────────────┼───────────────────────────────────────────────────┐
                       │                                                   │                                                   │
                       ▼                                                   ▼                                                   ▼
       ┌───────────────────────────────┐                   ┌───────────────────────────────┐                   ┌───────────────────────────────┐
       │     Google Gemini 2.0 Flash   │                   │      RAG Knowledge Base       │                   │   Bhashini ULCA / WhatsApp   │
       │     (@google/genai SDK)       │                   │   Verified Gazette Chunks     │                   │  (Optional Provider Adapters  │
       │  Server-side Generative AI    │                   │   Provenance & Exact Citations│                   │   with Built-in Fallbacks)    │
       └───────────────────────────────┘                   └───────────────────────────────┘                   └───────────────────────────────┘
```

1. **Frontend (Vercel):** Single Page Application deployed at `https://carbon-setu-live.vercel.app`. Built with React 19, TypeScript, Vite, and Tailwind CSS. Provides voice recording (Hindi/English), scheme filtering, eligibility comparisons, prefilled application forms, and RTI wizards. Communicates strictly with the backend API.
2. **Backend (Render):** Express/TypeScript server deployed at `https://carbon-setu-api.onrender.com`. Implements statutory eligibility evaluation, RAG evidence retrieval, application draft generation, RTI 6(1) and 19(1) legal drafting, and Bhashini/WhatsApp adapters.
3. **Database (Neon PostgreSQL):** Serverless PostgreSQL database storing user profiles, published welfare records, eligibility rules, and saved citizen action plans.
4. **RAG Knowledge Base:** Verified statutory government guidelines and gazette excerpts with exact provenance (document ID, clause, page, official `.gov.in` source URL) providing factual grounding for all recommendations.
5. **Generative AI (Google Gemini):** Synthesizes conversational explanations grounded exclusively in retrieved official documents.

---

## 2. Complete Third-Party Services & Integrations Inventory

| Service / Provider | Purpose | Status in Code | Required for Server to Start? | Free Tier / Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Neon PostgreSQL** | Primary relational database for persistence | **IMPLEMENTED AND TESTED** | **Yes** (Backend needs DB) | **Free tier**: 0.5 GiB storage, always free. [Neon Pricing](https://neon.tech/pricing) |
| **Google Gemini API** (`gemini-2.0-flash`) | Conversational intake & evidence synthesis | **IMPLEMENTED AND TESTED** | **No** (Uses deterministic rule engine if key missing) | **Free tier**: 15 Requests Per Minute (RPM) free in Google AI Studio. [AI Studio Pricing](https://ai.google.dev/pricing) |
| **RAG Knowledge Engine** | Verified statutory chunk retrieval with source provenance | **IMPLEMENTED AND TESTED** | **No** (Runs in-memory with pre-indexed gazettes) | **100% Free** (No external vector database subscription required). |
| **Web Speech API** | Browser native speech-to-text and text-to-speech (`hi-IN`, `en-IN`) | **IMPLEMENTED AND TESTED** | **No** (Browser native) | **100% Free** (Runs client-side in Chrome, Edge, Safari). |
| **Bhashini ULCA** | Official Government of India multilingual speech & translation | **IMPLEMENTED AND TESTED (With Mock & Fallback)** | **No** (Falls back to browser speech & direct text) | Free for authorized government / civic hackathon projects. [Bhashini Portal](https://bhashini.gov.in/) |
| **Meta WhatsApp Cloud API** | WhatsApp-based scheme discovery & webhook listener | **IMPLEMENTED AND TESTED (Behind Flag)** | **No** (Gracefully disabled if unconfigured) | Free Tier: First 1,000 service conversations/month free. [Meta WhatsApp Pricing](https://developers.facebook.com/docs/whatsapp/pricing) |
| **Vercel** | Single Page Application hosting | **IMPLEMENTED AND TESTED** | **Yes** (For frontend deployment) | **Free Hobby Tier**: Unlimited bandwidth for non-commercial projects. |
| **Render** | Node.js backend Web Service hosting | **IMPLEMENTED AND TESTED** | **Yes** (For backend API) | **Free Tier**: Spins down after 15 mins of inactivity (~50s cold start). |

---

## 3. Complete Environment Variable Inventory

### A. Backend Variables (Render / `server/.env`)

| Variable Name | Required? | Secret? | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Mandatory** | **Yes** | `postgresql://...` | Neon PostgreSQL pooled connection string. |
| `DIRECT_URL` | Optional | **Yes** | `postgresql://...` | Neon PostgreSQL direct connection string for migrations. |
| `JWT_SECRET` | **Mandatory** | **Yes** | `generate-via-openssl-rand-hex-32` | Cryptographic secret for signing citizen JWT tokens. |
| `SESSION_SECRET` | **Mandatory** | **Yes** | `generate-via-openssl-rand-hex-32` | Cryptographic secret for signing session cookies. |
| `FRONTEND_URL` | **Mandatory** | No | `https://carbon-setu-live.vercel.app` | Allowed CORS origin for Vercel frontend. |
| `NODE_ENV` | **Mandatory** | No | `production` | Node environment flag (`production` or `development`). |
| `PORT` | Optional | No | `3001` (Render auto-sets) | Port on which the API listens. |
| `GEMINI_API_KEY` | Optional | **Yes** | `AIzaSy...` | Enables real Gemini 2.0 Flash AI generation from [Google AI Studio](https://aistudio.google.com/). |
| `GEMINI_MODEL` | Optional | No | `gemini-2.0-flash` | Gemini model name. |
| `BHASHINI_USER_ID` | Optional | **Yes** | *(Provided by Bhashini)* | Bhashini ULCA User ID. |
| `BHASHINI_API_KEY` | Optional | **Yes** | *(Provided by Bhashini)* | Bhashini ULCA API Authorization Key. |
| `BHASHINI_PIPELINE_ID` | Optional | No | *(Provided by Bhashini)* | Bhashini ULCA Pipeline ID for ASR/Translation. |
| `WHATSAPP_TOKEN` | Optional | **Yes** | `EAA...` | Meta WhatsApp Cloud API Permanent Access Token. |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | No | `100609346426083` | Meta WhatsApp Business Phone Number ID. |
| `WHATSAPP_VERIFY_TOKEN` | Optional | **Yes** | `your-custom-webhook-verify-token` | Secret string for Meta Webhook verification handshake. |
| `WHATSAPP_APP_SECRET` | Optional | **Yes** | `your-meta-app-secret` | Used to verify incoming `X-Hub-Signature-256` HMAC. |

### B. Frontend Variables (Vercel / `client/.env`)

| Variable Name | Required? | Secret? | Value | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` (or `VITE_API_URL`) | **Mandatory** | No | `https://carbon-setu-api.onrender.com/api` | Points frontend API client to the live Render backend. |
| `VITE_APP_NAME` | Optional | No | `CARbon Setu` | Public application name displayed in headers. |

---

## 4. API Endpoints Reference

### Public & Citizen Endpoints
* **`GET /api/health`**: Basic health check (`{ status: "healthy", database: "connected", gemini: "..." }`).
* **`GET /api/health/diagnostics`**: Complete system diagnostic status (DB latency, Gemini model, RAG chunks, Bhashini status, WhatsApp status) without exposing secrets.
* **`GET /api/records`**: Scheme catalog search with category, state, and beneficiary filters.
* **`GET /api/records/:slug`**: Scheme detail with eligibility rules and official source URLs.
* **`POST /api/intake/start`**: Citizen intake session initiation with speech/text problem input.
* **`POST /api/applications/generate`**: Prefilled application form generator with document checklist and missing fields detection.
* **`GET /api/rti/authorities`**: Verified public authorities directory with RTI portal URLs and statutory notice.
* **`POST /api/rti/generate`**: Statutory Section 6(1) RTI application and Section 19(1) First Appeal drafting engine.
* **`GET /api/whatsapp/status`**: Public WhatsApp Cloud API integration status.
* **`GET /api/whatsapp/webhook`**: Meta Webhook verification handshake.
* **`POST /api/whatsapp/webhook`**: Meta incoming message receiver with HMAC verification and idempotency.

### Authenticated Citizen Endpoints (Require Bearer Token)
* **`POST /api/auth/register`** & **`POST /api/auth/login`**: Citizen account creation and login.
* **`GET /api/profile`** & **`PUT /api/profile`**: Extended citizen profile management.
* **`GET /api/saved/records`**: Saved scheme bookmarks.
* **`GET /api/saved/plans`**: Multi-step action plans with task completion tracking.
* **`GET /api/applications/drafts`**: Saved scheme application drafts.
* **`GET /api/rti/drafts`**: Saved RTI and First Appeal drafts.

### Admin Endpoints (Require `role: "ADMIN"`)
* **`GET /api/admin/stats`**: Overall records, users, and audit counts.
* **`GET /api/admin/records`** & **`POST /api/admin/records`**: Scheme record authoring and review.
* **`PATCH /api/admin/records/:id/status`**: Scheme publication and verification approval.
* **`GET /api/admin/knowledge-base`**: RAG Knowledge Base indexed documents and stats.
* **`POST /api/admin/ingest`**: Ingest and chunk new verified government gazette documents.

---

## 5. Step-by-Step Manual Setup Guide

### Step 1: Obtain a Free Google Gemini API Key
1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in with your Google account.
3. Click **Get API key** -> **Create API key in new project**.
4. Copy the generated key (`AIzaSy...`).
5. **Cost:** 100% Free (15 requests per minute free tier).

### Step 2: Configure Render Environment Variables
1. Go to **[Render Dashboard](https://dashboard.render.com/)**.
2. Click on your Web Service: **`carbon-setu-api`**.
3. In the left navigation, click **Environment**.
4. Add or verify the following:
   - `DATABASE_URL` = *(Your Neon PostgreSQL connection string)*
   - `FRONTEND_URL` = `https://carbon-setu-live.vercel.app`
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = *(Any secure 32+ character random string)*
   - `SESSION_SECRET` = *(Any secure 32+ character random string)*
   - `GEMINI_API_KEY` = *(Paste the Gemini key from Step 1)*
   - `GEMINI_MODEL` = `gemini-2.0-flash`
5. Click **Save Changes**. Render will automatically trigger a zero-downtime redeployment.

### Step 3: Configure Vercel Frontend Environment Variables
1. Go to **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Click on your project: **`carbon-setu-live`**.
3. Go to **Settings** -> **Environment Variables**.
4. Set:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://carbon-setu-api.onrender.com/api`
   - Environments: Production, Preview, Development
5. Click **Save**.
6. Redeploy the latest commit on Vercel to bake in the variable.

### Step 4: Verify Deployment Health
1. Open your browser and visit:
   `https://carbon-setu-api.onrender.com/api/health/diagnostics`
2. Confirm that `database.status` is `"connected"`, `aiEngine.hasServerKey` is `true`, and `ragKnowledgeBase.status` is `"active"`.

---

## 6. How to Run Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment files:**
   - Copy `server/.env.example` to `server/.env` and insert your Neon `DATABASE_URL` and `GEMINI_API_KEY`.
   - Copy `client/.env.example` to `client/.env`.

3. **Run automated test suite (35 tests):**
   ```bash
   npm run test:server
   ```

4. **Start local development servers:**
   ```bash
   npm run dev:server   # Starts backend on http://localhost:3001
   npm run dev:client   # Starts frontend on http://localhost:5173
   ```
