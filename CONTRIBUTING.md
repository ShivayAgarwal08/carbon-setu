# Contributing to CARbon Setu (कार्बन सेतु)

Thank you for your interest in contributing to **CARbon Setu**! This project is an open civic technology initiative aimed at democratizing access to welfare benefits, public services, and government schemes for all citizens of India.

---

## 🏛️ Guiding Principles

1. **Truth to Source:** Every government scheme record must link directly to an authoritative `.gov.in` or `.nic.in` portal.
2. **Citizen Dignity & Privacy:** We never ask for or store sensitive biometric identifiers (e.g., raw Aadhaar numbers). Demographic data is collected solely for eligibility evaluation.
3. **Accuracy & Clarity:** Eligibility criteria and financial benefits must be stated accurately, without confusing bureaucratic jargon.
4. **Statutory Integrity:** Clearly distinguish between statutory rules (mandated by law) and variable parameters (such as quarterly small savings interest rates).

---

## 🛠️ Development Setup

### 1. Prerequisites
- **Node.js** v20.x or v24.x
- **PostgreSQL** v13+ or Docker
- **Git**

### 2. Fork and Clone
```bash
git clone https://github.com/ShivayAgarwal08/carbon-setu.git
cd carbon-setu
```

### 3. Install Dependencies
```bash
# Install root, client, and server dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 4. Configure Environment
```bash
# Copy example templates
cp server/.env.example server/.env
cp client/.env.example client/.env
```
Update `server/.env` with your local PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/carbon_setu?schema=public"
DIRECT_URL="postgresql://postgres:yourpassword@localhost:5432/carbon_setu?schema=public"
```

### 5. Setup Database & Seed
```bash
npm run db:push
npm run db:seed
```

### 6. Run Development Servers
```bash
# Run both backend and frontend concurrently
npm run dev:server   # In terminal 1 (http://localhost:3001)
npm run dev:client   # In terminal 2 (http://localhost:5173)
```

---

## 🧪 Testing & Quality Assurance

Before submitting any Pull Request, ensure that all automated tests and production builds pass:

```bash
# Run the automated backend test suite
npm run test:server

# Run the full production build (both server and client)
npm run build
```

---

## 📋 Adding or Updating Government Schemes

When submitting new schemes or modifying existing records:
1. Verify eligibility rules and benefits against official gazettes or official ministerial websites.
2. Provide the official URL ending in `.gov.in`, `.nic.in`, or recognized official portal domains.
3. Update `server/prisma/seed.ts` using Prisma `upsert` so seeds remain idempotent.
4. Include test coverage or verify via `npm run test:server`.

---

## 🔒 Security & Vulnerability Reporting

If you discover a security vulnerability or potential credential exposure:
- **Do NOT** open a public GitHub issue.
- Contact the project maintainers directly or use GitHub Private Vulnerability Reporting.
- Never commit `.env` files, API keys, or database credentials.
