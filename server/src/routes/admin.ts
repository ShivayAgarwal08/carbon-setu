import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const adminRouter = Router();

// All admin routes require authentication + admin role
adminRouter.use(authenticate, requireAdmin);

// ── Records Management ──────────────────────────────────────────────────

// GET /api/admin/records
adminRouter.get('/records', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.governmentRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          department: { select: { name: true } },
          _count: { select: { eligibilityRules: true, sources: true, feedbackReports: true } },
        },
      }),
      prisma.governmentRecord.count({ where }),
    ]);

    return res.json({
      success: true,
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Admin records error', error);
    return res.status(500).json({ success: false, error: 'Failed to get records' });
  }
});

const recordSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  recordType: z.string(),
  category: z.string(),
  shortDescription: z.string().min(1),
  detailedDescription: z.string().min(1),
  beneficiaries: z.array(z.string()).default([]),
  stateScope: z.array(z.string()).default([]),
  geographicScope: z.string().optional(),
  eligibilityDetails: z.string().optional(),
  benefits: z.string().optional(),
  productTerms: z.string().optional(),
  requiredDocuments: z.array(z.string()).default([]),
  applicationProcess: z.string().optional(),
  officialUrl: z.string().url().optional().or(z.literal('')),
  applicationUrl: z.string().url().optional().or(z.literal('')),
  departmentId: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  sourceExcerpt: z.string().optional(),
  deadlineDate: z.string().optional(),
  effectiveDate: z.string().optional(),
  knownLimitations: z.string().optional(),
  requiresHumanReview: z.boolean().default(true),
});

// POST /api/admin/records
adminRouter.post('/records', async (req: AuthRequest, res: Response) => {
  try {
    const data = recordSchema.parse(req.body);

    const record = await prisma.governmentRecord.create({
      data: {
        ...data,
        officialUrl: data.officialUrl || null,
        applicationUrl: data.applicationUrl || null,
        sourceUrl: data.sourceUrl || null,
        deadlineDate: data.deadlineDate ? new Date(data.deadlineDate) : null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
        status: 'DRAFT',
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId!,
        action: 'create_record',
        entityType: 'GovernmentRecord',
        entityId: record.id,
        details: { title: record.title },
      },
    });

    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Create record error', error);
    return res.status(500).json({ success: false, error: 'Failed to create record' });
  }
});

// PUT /api/admin/records/:id
adminRouter.put('/records/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.governmentRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Record not found' });

    const data = recordSchema.partial().parse(req.body);

    // Track important field changes
    const importantFields = ['benefits', 'eligibilityDetails', 'productTerms', 'deadlineDate', 'officialUrl'];
    const editHistory: any[] = [];

    for (const field of importantFields) {
      if (data[field as keyof typeof data] !== undefined && data[field as keyof typeof data] !== (existing as any)[field]) {
        editHistory.push({
          recordId: existing.id,
          fieldName: field,
          oldValue: String((existing as any)[field] || ''),
          newValue: String(data[field as keyof typeof data] || ''),
          editedBy: req.userId!,
          reason: req.body.editReason || 'Updated by admin',
        });
      }
    }

    const record = await prisma.$transaction(async (tx) => {
      if (editHistory.length > 0) {
        await tx.recordEditHistory.createMany({ data: editHistory });
      }

      return tx.governmentRecord.update({
        where: { id: req.params.id },
        data: {
          ...data,
          officialUrl: data.officialUrl || undefined,
          applicationUrl: data.applicationUrl || undefined,
          sourceUrl: data.sourceUrl || undefined,
          deadlineDate: data.deadlineDate ? new Date(data.deadlineDate) : undefined,
          effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : undefined,
        },
      });
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId!,
        action: 'update_record',
        entityType: 'GovernmentRecord',
        entityId: record.id,
        details: { changedFields: Object.keys(data) },
      },
    });

    return res.json({ success: true, data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Update record error', error);
    return res.status(500).json({ success: false, error: 'Failed to update record' });
  }
});

// ── Status Changes ──────────────────────────────────────────────────────

const statusChangeSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'PUBLISHED', 'STALE', 'DISPUTED', 'ARCHIVED']),
  reason: z.string().optional(),
});

// PATCH /api/admin/records/:id/status
adminRouter.patch('/records/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const data = statusChangeSchema.parse(req.body);
    const existing = await prisma.governmentRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Record not found' });

    const updateData: any = { status: data.status };
    if (data.status === 'VERIFIED' || data.status === 'PUBLISHED') {
      updateData.lastVerifiedAt = new Date();
      updateData.verifiedBy = req.userId;
    }

    const record = await prisma.governmentRecord.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId!,
        action: data.status.toLowerCase(),
        entityType: 'GovernmentRecord',
        entityId: record.id,
        details: { from: existing.status, to: data.status, reason: data.reason },
      },
    });

    return res.json({ success: true, data: record });
  } catch (error) {
    logger.error('Status change error', error);
    return res.status(500).json({ success: false, error: 'Failed to change status' });
  }
});

// POST /api/admin/records/:id/verify — Mark verified and published
adminRouter.post('/records/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.governmentRecord.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Record not found' });

    const verified = await prisma.governmentRecord.update({
      where: { id: req.params.id },
      data: {
        status: 'PUBLISHED',
        requiresHumanReview: false,
        lastVerifiedAt: new Date(),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId!,
        action: 'verify_and_publish',
        entityType: 'GovernmentRecord',
        entityId: verified.id,
        details: { fromStatus: existing.status, verifiedAt: new Date().toISOString() },
      },
    });

    return res.json({ success: true, data: verified });
  } catch (error) {
    logger.error('Verify record error', error);
    return res.status(500).json({ success: false, error: 'Failed to verify record' });
  }
});

// POST /api/admin/records/import — Batch scheme import with deduplication
adminRouter.post('/records/import', async (req: AuthRequest, res: Response) => {
  try {
    const batchSchema = z.object({
      records: z.array(recordSchema).min(1).max(50),
      autoPublish: z.boolean().default(false),
    });

    const { records: items, autoPublish } = batchSchema.parse(req.body);

    const imported = [];
    const skipped = [];

    for (const item of items) {
      // Check for existing record by slug or title
      const existing = await prisma.governmentRecord.findFirst({
        where: {
          OR: [
            { slug: item.slug },
            { title: { equals: item.title, mode: 'insensitive' } },
          ],
        },
      });

      if (existing) {
        skipped.push({ title: item.title, slug: item.slug, reason: 'Duplicate scheme found' });
        continue;
      }

      const newRecord = await prisma.governmentRecord.create({
        data: {
          ...item,
          officialUrl: item.officialUrl || null,
          applicationUrl: item.applicationUrl || null,
          sourceUrl: item.sourceUrl || null,
          deadlineDate: item.deadlineDate ? new Date(item.deadlineDate) : null,
          effectiveDate: item.effectiveDate ? new Date(item.effectiveDate) : null,
          status: autoPublish ? 'PUBLISHED' : 'DRAFT',
          lastVerifiedAt: autoPublish ? new Date() : null,
          requiresHumanReview: !autoPublish,
        },
      });

      imported.push({ id: newRecord.id, title: newRecord.title, slug: newRecord.slug });
    }

    await prisma.adminAuditLog.create({
      data: {
        adminId: req.userId!,
        action: 'batch_import_records',
        entityType: 'GovernmentRecord',
        entityId: 'BATCH',
        details: { totalSubmitted: items.length, importedCount: imported.length, skippedCount: skipped.length },
      },
    });

    return res.json({
      success: true,
      data: {
        total: items.length,
        importedCount: imported.length,
        skippedCount: skipped.length,
        imported,
        skipped,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Batch import error', error);
    return res.status(500).json({ success: false, error: 'Failed to import records' });
  }
});

// ── Feedback Management ─────────────────────────────────────────────────

// GET /api/admin/feedback
adminRouter.get('/feedback', async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string || 'pending';
    const feedback = await prisma.feedbackReport.findMany({
      where: { status },
      include: {
        user: { select: { name: true, email: true } },
        record: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: feedback });
  } catch (error) {
    logger.error('Get feedback error', error);
    return res.status(500).json({ success: false, error: 'Failed to get feedback' });
  }
});

// PATCH /api/admin/feedback/:id
adminRouter.patch('/feedback/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = z.object({ status: z.enum(['reviewed', 'resolved', 'dismissed']) }).parse(req.body);
    const feedback = await prisma.feedbackReport.update({
      where: { id: req.params.id },
      data: { status },
    });
    return res.json({ success: true, data: feedback });
  } catch (error) {
    logger.error('Update feedback error', error);
    return res.status(500).json({ success: false, error: 'Failed to update feedback' });
  }
});

// ── Source Registry ─────────────────────────────────────────────────────

// GET /api/admin/sources
adminRouter.get('/sources', async (_req, res: Response) => {
  try {
    const sources = await prisma.sourceRegistry.findMany({
      include: { _count: { select: { sources: true } } },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: sources });
  } catch (error) {
    logger.error('Get sources error', error);
    return res.status(500).json({ success: false, error: 'Failed to get sources' });
  }
});

// POST /api/admin/sources/check/:id — Safe source check
adminRouter.post('/sources/check/:id', async (req: AuthRequest, res: Response) => {
  try {
    const source = await prisma.sourceRegistry.findUnique({ where: { id: req.params.id } });
    if (!source) return res.status(404).json({ success: false, error: 'Source not found' });

    // Domain allowlist check
    const allowedDomains = [
      'india.gov.in', 'myscheme.gov.in', 'pmfby.gov.in', 'indiapost.gov.in',
      'services.india.gov.in', 'data.gov.in', 'igod.gov.in',
      'nps.gov.in', 'nhm.gov.in', 'scholarships.gov.in',
    ];

    const url = new URL(source.baseUrl);
    const isAllowed = allowedDomains.some(d => url.hostname.endsWith(d));

    if (!isAllowed) {
      await prisma.sourceRegistry.update({
        where: { id: source.id },
        data: { lastCheckedAt: new Date(), checkStatus: 'blocked' },
      });
      return res.json({
        success: true,
        data: { status: 'blocked', message: 'Domain not in allowlist' },
      });
    }

    // Attempt fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(source.baseUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CARbonSetu-SourceChecker/1.0' },
      });

      clearTimeout(timeout);

      await prisma.sourceRegistry.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: new Date(),
          checkStatus: response.ok ? 'success' : 'failed',
        },
      });

      return res.json({
        success: true,
        data: { status: response.ok ? 'success' : 'failed', statusCode: response.status },
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      await prisma.sourceRegistry.update({
        where: { id: source.id },
        data: { lastCheckedAt: new Date(), checkStatus: 'timeout' },
      });
      return res.json({ success: true, data: { status: 'timeout' } });
    }
  } catch (error) {
    logger.error('Source check error', error);
    return res.status(500).json({ success: false, error: 'Source check failed' });
  }
});

// ── Audit Logs ──────────────────────────────────────────────────────────

// GET /api/admin/audit
adminRouter.get('/audit', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Get audit logs error', error);
    return res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

// ── Dashboard Stats ─────────────────────────────────────────────────────

// GET /api/admin/stats
adminRouter.get('/stats', async (_req, res: Response) => {
  try {
    const [
      totalRecords, publishedRecords, draftRecords, staleRecords,
      pendingFeedback, totalUsers, totalSessions,
    ] = await Promise.all([
      prisma.governmentRecord.count(),
      prisma.governmentRecord.count({ where: { status: 'PUBLISHED' } }),
      prisma.governmentRecord.count({ where: { status: 'DRAFT' } }),
      prisma.governmentRecord.count({ where: { status: 'STALE' } }),
      prisma.feedbackReport.count({ where: { status: 'pending' } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.intakeSession.count(),
    ]);

    return res.json({
      success: true,
      data: {
        totalRecords, publishedRecords, draftRecords, staleRecords,
        pendingFeedback, totalUsers, totalSessions,
      },
    });
  } catch (error) {
    logger.error('Stats error', error);
    return res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});
