process.env.NODE_ENV = 'test';
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
    (server as any).closeAllConnections?.();
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
    let testSessionId = '';

    after(async () => {
      if (testSessionId) {
        try {
          await prisma.recommendation.deleteMany({ where: { sessionId: testSessionId } });
          await prisma.intakeMessage.deleteMany({ where: { sessionId: testSessionId } });
          await prisma.intakeSession.deleteMany({ where: { id: testSessionId } });
        } catch (err) {
          console.error('Error in after hook for IntakeSession cleanup:', err);
        }
      }
    });

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
      testSessionId = data.data.session.id;
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

  describe('5. Authentication, Citizen Profile & User Persistence', () => {
    const testEmail = `test_citizen_${Date.now()}@example.com`;
    const testPassword = 'SecureCitizenPassword@2026';
    let authToken = '';
    let testUserId = '';

    after(async () => {
      // Clean up test records and user to leave production database clean
      if (testUserId) {
        await prisma.savedRecord.deleteMany({ where: { userId: testUserId } });
        await prisma.userProfile.deleteMany({ where: { userId: testUserId } });
        await prisma.user.deleteMany({ where: { id: testUserId } });
      }
    });

    it('POST /api/auth/register registers a new citizen account', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Pooja Sharma',
          preferredLang: 'hi',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.token);
      assert.equal(data.data.user.email, testEmail);
      assert.equal(data.data.user.role, 'CITIZEN');
      testUserId = data.data.user.id;
    });

    it('POST /api/auth/login successfully logs in the registered citizen', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.token);
      authToken = data.data.token;
      assert.equal(data.data.user.role, 'CITIZEN');
    });

    it('POST /api/auth/login rejects wrong password with 401', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123!',
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
    });

    it('PUT /api/profile persists extended citizen profile attributes', async () => {
      const res = await fetch(`${BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Pooja Sharma Updated',
          state: 'Uttar Pradesh',
          district: 'Lucknow',
          age: 32,
          incomeAnnual: 180000,
          casteCategory: 'OBC',
          isFarmer: true,
          isStudent: false,
          isBpl: true,
          hasDisability: false,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.state, 'Uttar Pradesh');
      assert.equal(data.data.age, 32);
      assert.equal(data.data.isFarmer, true);
      assert.equal(data.data.isBpl, true);
    });

    it('GET /api/profile retrieves persisted attributes after fresh request', async () => {
      const res = await fetch(`${BASE_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.state, 'Uttar Pradesh');
      assert.equal(data.data.district, 'Lucknow');
      assert.equal(data.data.age, 32);
      assert.equal(data.data.incomeAnnual, 180000);
      assert.equal(data.data.isFarmer, true);
    });

    it('POST /api/saved/records/:recordId and GET /api/saved/records persists bookmarks', async () => {
      const schemes = await prisma.governmentRecord.findMany({ take: 1 });
      assert.ok(schemes.length > 0);
      const schemeId = schemes[0].id;

      // Save scheme
      const saveRes = await fetch(`${BASE_URL}/api/saved/records/${schemeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notes: 'Testing persistence in Neon' }),
      });
      assert.equal(saveRes.status, 201);

      // Retrieve saved schemes
      const getRes = await fetch(`${BASE_URL}/api/saved/records`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      assert.equal(getRes.status, 200);
      const savedData = await getRes.json();
      assert.equal(savedData.success, true);
      assert.ok(savedData.data.some((item: any) => item.recordId === schemeId));
    });
  });

  describe('6. RTI & First Appeal Legal Drafting API', () => {
    it('GET /api/rti/authorities returns verified public authorities & statutory notice', async () => {
      const res = await fetch(`${BASE_URL}/api/rti/authorities`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.data));
      assert.ok(data.data.length > 0);
      assert.equal(data.statutoryNotice.centralApplicationSection, 'Section 6(1)');
      assert.equal(data.statutoryNotice.firstAppealSection, 'Section 19(1)');
    });

    it('POST /api/rti/generate generates a formal Section 6(1) RTI draft', async () => {
      const res = await fetch(`${BASE_URL}/api/rti/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'RTI_REQUEST',
          publicAuthority: 'Ministry of Agriculture and Farmers Welfare',
          applicantName: 'Ramesh Patel',
          address: 'Village Rampur, Tehsil Sadar',
          state: 'Uttar Pradesh',
          pincode: '226001',
          phone: '9876543210',
          isBpl: true,
          bplCardNumber: 'BPL/UP/2026/89218',
          subject: 'Status of PM-Kisan installment for FY 2024-25',
          timePeriod: '01 April 2024 to 31 March 2025',
          specificQueries: [
            'What is the current approval status of my PM-Kisan beneficiary application?',
            'If payment is on hold, specify the exact technical error code recorded in the database.',
          ],
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.type, 'RTI_REQUEST');
      assert.ok(data.data.draftText.includes('SECTION 6(1)'));
      assert.ok(data.data.draftText.includes('Ramesh Patel'));
      assert.ok(data.data.draftText.includes('BPL/UP/2026/89218'));
      assert.ok(data.data.statutoryReferences.some((r: string) => r.includes('Section 6(1)')));
    });

    it('POST /api/rti/generate generates a formal Section 19(1) First Appeal draft', async () => {
      const res = await fetch(`${BASE_URL}/api/rti/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FIRST_APPEAL',
          publicAuthority: 'Ministry of Agriculture and Farmers Welfare',
          firstAppellateAuthority: 'Joint Secretary / First Appellate Authority',
          originalRtiDate: '2026-08-01',
          originalRtiRegNumber: 'MOABR/R/E/26/00182',
          cpioNameOrDesignation: 'CPIO, Agriculture Division',
          receivedNoResponse: true,
          groundsOfAppeal: [
            'No response or information was furnished by the Respondent CPIO within the statutory 30-day period.',
          ],
          specificReliefSought:
            'Direct the CPIO to immediately supply the complete requested information free of cost under Section 7(6).',
          applicantName: 'Ramesh Patel',
          address: 'Village Rampur, Tehsil Sadar',
          state: 'Uttar Pradesh',
          pincode: '226001',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.type, 'FIRST_APPEAL');
      assert.ok(data.data.draftText.includes('SECTION 19(1)'));
      assert.ok(data.data.draftText.includes('MOABR/R/E/26/00182'));
      assert.ok(data.data.draftText.includes('free of cost'));
    });
  });

  describe('7. Scheme Action Plans & Milestone Progress API', () => {
    let testPlanId = '';
    const citizenEmail = `plan_tester_${Date.now()}@example.com`;
    let userToken = '';
    let citizenId = '';

    before(async () => {
      const reg = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: citizenEmail,
          password: 'Password@PlanTest1',
          name: 'Plan Tester',
        }),
      });
      const data = await reg.json();
      userToken = data.data.token;
      citizenId = data.data.user.id;
    });

    after(async () => {
      if (citizenId) {
        await prisma.savedActionPlan.deleteMany({ where: { userId: citizenId } });
        await prisma.user.deleteMany({ where: { id: citizenId } });
      }
    });

    it('POST /api/saved/plans creates an interactive scheme action plan', async () => {
      const res = await fetch(`${BASE_URL}/api/saved/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          title: 'Ayushman Bharat PM-JAY Application Plan',
          plan: {
            status: 'preparing_documents',
            steps: [
              { order: 1, text: 'Obtain / Verify Ration Card', completed: true },
              { order: 2, text: 'Obtain Aadhaar Card', completed: true },
              { order: 3, text: 'Visit Ayushman Mitra kiosk at nearest empaneled hospital', completed: false },
            ],
          },
          notes: 'Test action plan creation',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.id);
      testPlanId = data.data.id;
    });

    it('GET /api/saved/plans retrieves active action plans for user', async () => {
      const res = await fetch(`${BASE_URL}/api/saved/plans`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data.some((p: any) => p.id === testPlanId));
    });

    it('PUT /api/saved/plans/:id updates task completion & status', async () => {
      const res = await fetch(`${BASE_URL}/api/saved/plans/${testPlanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          plan: {
            status: 'submitted',
            applicationRef: 'PMJAY/2026/LKO/00192',
            steps: [
              { order: 1, text: 'Obtain / Verify Ration Card', completed: true },
              { order: 2, text: 'Obtain Aadhaar Card', completed: true },
              { order: 3, text: 'Visit Ayushman Mitra kiosk at nearest empaneled hospital', completed: true },
            ],
          },
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.data.plan.status, 'submitted');
    });

    it('DELETE /api/saved/plans/:id deletes the action plan', async () => {
      const res = await fetch(`${BASE_URL}/api/saved/plans/${testPlanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
    });
  });
});

