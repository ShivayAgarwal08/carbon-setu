import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../index';
import { prisma } from '../utils/prisma';
import { evaluateEligibility, rankRecords } from '../services/eligibility';

describe('CARbon Setu Full API & Rule Engine Test Suite', () => {
  let server: http.Server;
  const PORT = 3099;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    await prisma.$connect();
    server = app.listen(PORT);
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  describe('1. Health & Database Connectivity', () => {
    it('GET /api/health returns healthy and database connected', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.status, 'healthy');
      assert.equal(data.database, 'connected');
    });
  });

  describe('2. Public Scheme Records Discovery & Filtering', () => {
    it('GET /api/records returns published schemes with pagination', async () => {
      const res = await fetch(`${BASE_URL}/api/records?limit=6`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.length > 0);
      assert.ok(data.pagination.total > 0);
    });

    it('GET /api/records/categories returns category breakdown', async () => {
      const res = await fetch(`${BASE_URL}/api/records/categories`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.length > 0);
    });

    it('GET /api/records/:slug returns scheme detail for ayushman-bharat-pmjay', async () => {
      const res = await fetch(`${BASE_URL}/api/records/ayushman-bharat-pmjay`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.title.includes('Ayushman Bharat'));
      assert.equal(data.data.category, 'HEALTHCARE');
      assert.ok(data.data.department);
    });

    it('GET /api/records/non-existent-xyz returns 404', async () => {
      const res = await fetch(`${BASE_URL}/api/records/non-existent-xyz`);
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  describe('3. Citizen Intake & Recommendations API', () => {
    it('POST /api/intake/start initiates consultation session', async () => {
      const res = await fetch(`${BASE_URL}/api/intake/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: 'I am a small farmer with 2 acres in Uttar Pradesh needing crop subsidy and seeds',
          profile: {
            state: 'Uttar Pradesh',
            occupation: 'Farmer',
            category: 'OBC',
          },
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.session);
      assert.ok(data.data.session.id);
    });
  });

  describe('4. Eligibility Rule Engine', () => {
    it('evaluates scheme eligibility with percentage match', async () => {
      const record = await prisma.governmentRecord.findFirst({
        where: { status: 'PUBLISHED' },
        include: { eligibilityRules: true },
      });

      assert.ok(record, 'A published record must exist');
      const result = evaluateEligibility(record as any, {
        state: 'Uttar Pradesh',
        category: 'general',
      });

      assert.ok(result.percentage >= 0);
      assert.ok(result.label);
    });

    it('ranks schemes correctly for citizen profile', async () => {
      const records = await prisma.governmentRecord.findMany({
        where: { status: 'PUBLISHED' },
        include: { eligibilityRules: true },
        take: 5,
      });

      const ranked = rankRecords(records as any, {
        category: 'farmer',
        state: 'Uttar Pradesh',
      });

      assert.ok(ranked.length > 0);
      assert.ok(ranked[0].score >= 0);
    });
  });

  describe('5. Authentication & Citizen Login', () => {
    it('POST /api/auth/login logs in demo citizen user', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'citizen@carbonsetu.in',
          password: 'CitizenPass@2026',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.token);
      assert.equal(data.data.user.role, 'CITIZEN');
    });

    it('POST /api/auth/login rejects wrong password with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'citizen@carbonsetu.in',
          password: 'IncorrectPassword',
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });
});
