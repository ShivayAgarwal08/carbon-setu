# CARbon Setu (कार्बन सेतु)
### AI-Assisted Indian Government Schemes Discovery & Eligibility Platform

[![CI Verification](https://img.shields.io/badge/Status-Verified_Working-10b981?style=for-the-badge)](https://github.com/ShivayAgarwal08/carbon-setu)
[![Digital India](https://img.shields.io/badge/Civic_Tech-Digital_India-f97316?style=for-the-badge)](https://github.com/ShivayAgarwal08/carbon-setu)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 🇮🇳 Project Overview & The Problem It Solves

India has hundreds of central and state welfare initiatives — Direct Benefit Transfers (DBT), healthcare coverage, farmer insurance, education scholarships, and housing subsidies. However, millions of eligible citizens miss out on their statutory entitlements due to:
- Complex administrative documentation and fragmented departmental websites.
- Lack of centralized discovery tools and pervasive bureaucratic jargon.
- Inability to quickly evaluate eligibility or prepare necessary documents prior to visiting government service centers (Common Service Centers / Jan Seva Kendra).

**CARbon Setu (कार्बन सेतु)** is an open, full-stack civic technology platform designed to bridge this divide. It provides an intuitive, AI-assisted conversational benefit finder alongside a deterministic rule matching engine. Citizens describe their background in plain language to receive personalized scheme recommendations, calculate match confidence scores, check document readiness, and link directly to official government application portals.

---

## 🏛️ Major Features

- **🤖 AI Benefit Finder:** Conversational intake guided by Google Gemini 2.0 Flash, with an automated fallback to a deterministic rule-based matching engine when no AI key is configured or offline.
- **📂 Public Schemes Catalog:** Multi-dimensional filtering by Category (Agriculture, Healthcare, Education, Housing, Financial Inclusion, Social Welfare), State, and Benefit Type with server-side pagination.
- **📋 Interactive Document Readiness Checker:** Step-by-step checklist verifying required documents (Aadhaar, Income Certificate, Land Records, Ration Card) before applying.
- **⚖️ Side-by-Side Scheme Comparison:** Compare up to 3 welfare schemes simultaneously across financial ceilings, key benefits, paperwork, and official URLs.
- **👤 Citizen Profile & Application Tracker:** Saved schemes and application pipeline tracking (Not Started, Documents Gathering, Applied, Approved).
- **🛡️ Administrative Operations Portal:** Role-based access control (RBAC), scheme CRUD management, discrepancy reporting triage, and audit logging.
- **🇮🇳 Bilingual-Ready Theming:** Tailored palette inspired by the Tiranga (Deep Navy, Saffron, Ashoka Emerald) built with high-contrast accessibility standards.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 8, TypeScript, Tailwind CSS v4, Lucide React icons, Axios |
| **Backend API** | Node.js 20+, Express 5, TypeScript, Prisma ORM 5, esbuild |
| **Database** | PostgreSQL 13+ (Local cluster or Neon Serverless PostgreSQL) |
| **AI / Machine Learning** | Google Gen AI SDK (`@google/genai`), Gemini 2.0 Flash + Heuristic Rule Engine |
| **Security & Auth** | JSON Web Tokens (JWT), HttpOnly cookies, Bcrypt (12 salt rounds), Helmet, Express Rate Limit, Zod |
| **DevOps & Containers**| Multi-stage Dockerfiles (`Dockerfile.server`, `Dockerfile.client`), Nginx, Docker Compose |

---

## 📁 Project Folder Structure

```
CARBON_SETU/
├── client/                     # Frontend Single Page Application (Vite + React)
│   ├── public/                 # Static assets (favicons, SVG icons)
│   ├── src/
│   │   ├── api/client.ts       # Central Axios client with auth interceptors
│   │   ├── components/         # Navbar, Footer, SchemeCard, CompareDrawer, EligibilityBadge
│   │   ├── context/            # AuthContext, CompareContext
│   │   ├── pages/              # Home, Intake, Catalog, Detail, Compare, Profile, Admin, Auth
│   │   ├── types/index.ts      # TypeScript interfaces and domain schemas
│   │   ├── index.css           # Design tokens, accessibility, and utility classes
│   │   └── App.tsx             # Route definitions and application shell
│   ├── .env.example            # Client environment variable template
│   ├── package.json            # Client dependencies and build scripts
│   └── vite.config.ts          # Vite build configuration
├── server/                     # Backend REST API (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma       # Relational models (SchemeRecord, Department, Rule, User)
│   │   └── seed.ts             # Repeatable seed script with 12 verified Indian schemes
│   ├── src/
│   │   ├── middleware/         # Auth verification, admin guard, error handler, rate limiters
│   │   ├── routes/             # records, intake, auth, profile, saved, feedback, admin, health
│   │   ├── services/           # eligibility rule engine, Google Gemini AI integration
│   │   ├── utils/              # prisma singleton, structured logger
│   │   ├── tests/api.test.ts   # Automated API and rule engine test suite
│   │   └── index.ts            # Express server initialization and shutdown lifecycle
│   ├── .env.example            # Server environment variable template
│   ├── package.json            # Server dependencies and build scripts
│   └── tsconfig.json           # Node TypeScript configuration
├── .env.example                # Root monorepo environment template
├── .gitignore                  # Comprehensive gitignore (protects secrets, DBs, and builds)
├── docker-compose.yml          # Container orchestration for local full-stack execution
├── Dockerfile.client           # Multi-stage client build with Nginx reverse proxy
├── Dockerfile.server           # Multi-stage server build
├── nginx.conf                  # Nginx production configuration
├── CONTRIBUTING.md             # Contributor guidelines
├── package.json                # Monorepo root scripts
└── README.md                   # Project documentation
```

---

## ⚙️ Prerequisites & Local Installation

### Prerequisites
- **Node.js:** v20.x or v24.x ([Download](https://nodejs.org/))
- **npm:** v10.x+
- **PostgreSQL:** v13+ installed locally or accessible remotely ([Download](https://www.postgresql.org/download/))
- **Git:** ([Download](https://git-scm.com/))

### Installation
Clone the repository and install dependencies across all workspaces:
```bash
git clone https://github.com/ShivayAgarwal08/carbon-setu.git
cd carbon-setu

# Install root dependencies
npm install

# Install client and server dependencies
cd client && npm install
cd ../server && npm install
cd ..
```

---

## 🔐 Environment Variables Configuration

Copy the provided example files to create your local `.env` files:

```bash
# In server directory:
cp server/.env.example server/.env

# In client directory:
cp client/.env.example client/.env
```

### Server Configuration (`server/.env`)
Edit `server/.env` with your PostgreSQL credentials:
```env
# Database connection string
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/carbon_setu?schema=public"
DIRECT_URL="postgresql://postgres:yourpassword@localhost:5432/carbon_setu?schema=public"

# Google Gemini AI (Optional - leave empty for deterministic rule fallback)
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.0-flash"

# Session & JWT Secrets (Use strong random strings)
SESSION_SECRET="generate-a-random-64-character-string"
JWT_SECRET="generate-another-random-64-character-string"

# Network
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Admin account bootstrap (Used for initial seeding)
ADMIN_EMAIL="admin@carbonsetu.in"
ADMIN_PASSWORD="YourSecurePasswordHere"
```

### Client Configuration (`client/.env`)
Edit `client/.env` to point to the backend API:
```env
VITE_API_BASE_URL="http://localhost:3001/api"
VITE_APP_NAME="CARbon Setu"
```

---

## 🗄️ Setting Up PostgreSQL & Prisma

1. Ensure your PostgreSQL service is running and create the database:
   ```sql
   CREATE DATABASE carbon_setu;
   ```
2. Push the Prisma schema to synchronize tables:
   ```bash
   npm run db:push
   ```
3. Run the repeatable database seed script:
   ```bash
   npm run db:seed
   ```
   *The seed script is fully idempotent using Prisma `upsert` queries. It populates 8 government departments, 6 official source registries, 12 statutory welfare schemes, 22 eligibility rules, and demo accounts.*

---

## 🚀 Running the Application Locally

Run the frontend and backend in separate terminal windows:

### Terminal 1: Backend Server
```bash
npm run dev:server
# API starts at: http://localhost:3001
# Health check: http://localhost:3001/api/health
```

### Terminal 2: Frontend Client
```bash
npm run dev:client
# Web App opens at: http://localhost:5173
```

---

## 🧪 Testing & Production Builds

### Running Automated Tests
```bash
npm run test:server
```
Runs the 10-point test suite validating database health, scheme pagination, category breakdown, scheme detail queries, intake consultation session handling, eligibility scoring logic, and citizen authentication.

### Building for Production
```bash
npm run build
```
Executes:
1. `build:server`: Bundles backend via `esbuild` into `server/dist/index.js` (~72 KB).
2. `build:client`: Compiles TypeScript and packages assets via Vite into `client/dist/`.

---

## 🤖 Configuring Google Gemini AI Securely

CARbon Setu supports both **AI-assisted recommendations** and a **zero-dependency heuristic rule engine**:

1. **Security Rule:** Never place your `GEMINI_API_KEY` in the client directory or commit it to Git. The frontend never communicates directly with Google's API.
2. **With an API Key:** Add your key to `server/.env`:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```
   The backend uses `@google/genai` with `gemini-2.0-flash` to synthesize natural language citizen queries into structured demographic criteria and personalized recommendations.
3. **Without an API Key (Fallback Mode):** If `GEMINI_API_KEY` is empty, the application automatically activates the deterministic rule engine without throwing errors. Eligibility percentages and document requirements are computed directly using database criteria.

---

## ☁️ Deployment Architecture Overview

*Note: The application has been built and tested locally using Docker, Node.js, and PostgreSQL. Deploying to third-party cloud services requires setting up accounts on those platforms.*

### Database: Neon Serverless PostgreSQL
- Create a project on [Neon](https://neon.tech) and copy the pooled connection string.
- Set `DATABASE_URL` and `DIRECT_URL` in the cloud environment.
- Run `npx prisma db push && npm run db:seed` against the Neon database.

### Backend: Render Web Service
- Connect the GitHub repository to [Render](https://render.com).
- Create a Web Service pointing to `server/Dockerfile.server` or Node runtime.
- Set environment variables (`DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`, `GEMINI_API_KEY`).
- Health Check path: `/api/health`.

### Frontend: Vercel
- Import the repository on [Vercel](https://vercel.com).
- Set the Root Directory to `client`.
- Build command: `npm run build`, Output directory: `dist`.
- Set environment variable: `VITE_API_BASE_URL=https://your-render-api.onrender.com/api`.

---

## ⚠️ Important Legal & Statutory Disclaimer

> **DISCLAIMER:** CARbon Setu (कार्बन सेतु) is an independent civic-technology initiative created to assist citizens in discovering public welfare benefits. CARbon Setu is **not affiliated with, endorsed by, or operated by the Government of India or any State Government**.
> 
> Eligibility indications and matching percentages provided by this platform or its AI assistant are strictly informational and do not guarantee scheme sanctions. Final approval, benefit disbursals, and formal applications are governed solely by the respective government authorities. Citizens must verify all details and submit applications on official government portals (`.gov.in` and `.nic.in`).

---

## 📜 License & Copyright

Released as an open-source civic digital public good under the [MIT License](LICENSE).  
Copyright © 2026 Shivay Agarwal and CARbon Setu Contributors.

