import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Prisma } from '@prisma/client';

export const recordsRouter = Router();

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  recordType: z.string().optional(),
  state: z.string().optional(),
  beneficiary: z.string().optional(),
  sort: z.enum(['relevance', 'recent', 'verified']).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(12),
});

// GET /api/records — Search and browse
recordsRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const params = searchSchema.parse(req.query);
    const skip = (params.page - 1) * params.limit;

    // Build filter conditions
    const where: Prisma.GovernmentRecordWhereInput = {
      status: 'PUBLISHED',
    };

    if (params.category) {
      where.category = params.category as any;
    }
    if (params.recordType) {
      where.recordType = params.recordType as any;
    }
    if (params.state) {
      where.OR = [
        { stateScope: { has: params.state } },
        { stateScope: { isEmpty: true } }, // National schemes
        { geographicScope: 'national' },
      ];
    }
    if (params.beneficiary) {
      where.beneficiaries = { has: params.beneficiary };
    }

    // Text search
    if (params.q) {
      const searchTerm = params.q.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
            { detailedDescription: { contains: searchTerm, mode: 'insensitive' } },
            { beneficiaries: { hasSome: [searchTerm.toLowerCase()] } },
          ],
        },
      ];
    }

    // Sort
    let orderBy: Prisma.GovernmentRecordOrderByWithRelationInput = { updatedAt: 'desc' };
    if (params.sort === 'verified') {
      orderBy = { lastVerifiedAt: 'desc' };
    } else if (params.sort === 'recent') {
      orderBy = { createdAt: 'desc' };
    }

    const [records, total] = await Promise.all([
      prisma.governmentRecord.findMany({
        where,
        orderBy,
        skip,
        take: params.limit,
        select: {
          id: true,
          title: true,
          slug: true,
          recordType: true,
          category: true,
          shortDescription: true,
          beneficiaries: true,
          stateScope: true,
          geographicScope: true,
          status: true,
          officialUrl: true,
          lastVerifiedAt: true,
          department: { select: { id: true, name: true, shortName: true } },
        },
      }),
      prisma.governmentRecord.count({ where }),
    ]);

    return res.json({
      success: true,
      data: records,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid search parameters', details: error.errors });
    }
    logger.error('Search error', error);
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// GET /api/records/categories — Get available categories with counts
recordsRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.governmentRecord.groupBy({
      by: ['category'],
      where: { status: 'PUBLISHED' },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    return res.json({
      success: true,
      data: categories.map(c => ({ category: c.category, count: c._count.category })),
    });
  } catch (error) {
    logger.error('Categories error', error);
    return res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
});

// GET /api/records/:slug — Get record detail
recordsRouter.get('/:slug', optionalAuth, async (req: Request, res: Response) => {
  try {
    const record = await prisma.governmentRecord.findUnique({
      where: { slug: req.params.slug },
      include: {
        department: {
          include: {
            contacts: { where: { isVerified: true } },
          },
        },
        eligibilityRules: true,
        sources: { where: { isValid: true } },
      },
    });

    if (!record || (record.status !== 'PUBLISHED' && record.status !== 'VERIFIED')) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Check if user has saved this record
    let isSaved = false;
    const authReq = req as AuthRequest;
    if (authReq.userId) {
      const saved = await prisma.savedRecord.findUnique({
        where: { userId_recordId: { userId: authReq.userId, recordId: record.id } },
      });
      isSaved = !!saved;
    }

    return res.json({
      success: true,
      data: { ...record, isSaved },
    });
  } catch (error) {
    logger.error('Record detail error', error);
    return res.status(500).json({ success: false, error: 'Failed to get record' });
  }
});
