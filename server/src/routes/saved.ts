import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const savedRouter = Router();

// ── Saved Records ────────────────────────────────────────────────────────

// GET /api/saved/records
savedRouter.get('/records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const saved = await prisma.savedRecord.findMany({
      where: { userId: req.userId! },
      include: {
        record: {
          select: {
            id: true, title: true, slug: true, shortDescription: true,
            category: true, recordType: true, officialUrl: true, lastVerifiedAt: true, status: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: saved });
  } catch (error) {
    logger.error('Get saved records error', error);
    return res.status(500).json({ success: false, error: 'Failed to get saved records' });
  }
});

// POST /api/saved/records/:recordId
savedRouter.post('/records/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { recordId } = req.params;

    const record = await prisma.governmentRecord.findUnique({ where: { id: recordId } });
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });

    const saved = await prisma.savedRecord.upsert({
      where: { userId_recordId: { userId: req.userId!, recordId } },
      update: { notes: req.body.notes },
      create: { userId: req.userId!, recordId, notes: req.body.notes },
    });
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error('Save record error', error);
    return res.status(500).json({ success: false, error: 'Failed to save record' });
  }
});

// DELETE /api/saved/records/:recordId
savedRouter.delete('/records/:recordId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.savedRecord.deleteMany({
      where: { userId: req.userId!, recordId: req.params.recordId },
    });
    return res.json({ success: true, message: 'Record removed from saved items' });
  } catch (error) {
    logger.error('Remove saved record error', error);
    return res.status(500).json({ success: false, error: 'Failed to remove saved record' });
  }
});

// ── Action Plans ─────────────────────────────────────────────────────────

const actionPlanSchema = z.object({
  title: z.string().min(1).max(200),
  recordId: z.string().optional(),
  plan: z.object({
    steps: z.array(z.object({
      text: z.string(),
      completed: z.boolean().default(false),
      order: z.number(),
    })),
  }),
  notes: z.string().optional(),
});

// GET /api/saved/plans
savedRouter.get('/plans', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.savedActionPlan.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: plans });
  } catch (error) {
    logger.error('Get plans error', error);
    return res.status(500).json({ success: false, error: 'Failed to get action plans' });
  }
});

// POST /api/saved/plans
savedRouter.post('/plans', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = actionPlanSchema.parse(req.body);
    const plan = await prisma.savedActionPlan.create({
      data: {
        userId: req.userId!,
        title: data.title,
        recordId: data.recordId,
        plan: data.plan as any,
        notes: data.notes,
      },
    });
    return res.status(201).json({ success: true, data: plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Create plan error', error);
    return res.status(500).json({ success: false, error: 'Failed to create action plan' });
  }
});

// PUT /api/saved/plans/:planId
savedRouter.put('/plans/:planId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.savedActionPlan.findFirst({
      where: { id: req.params.planId, userId: req.userId! },
    });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    const data = actionPlanSchema.partial().parse(req.body);
    const updated = await prisma.savedActionPlan.update({
      where: { id: req.params.planId },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.plan ? { plan: data.plan as any } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update plan error', error);
    return res.status(500).json({ success: false, error: 'Failed to update plan' });
  }
});

// DELETE /api/saved/plans/:planId
savedRouter.delete('/plans/:planId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.savedActionPlan.findFirst({
      where: { id: req.params.planId, userId: req.userId! },
    });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    await prisma.savedActionPlan.delete({ where: { id: req.params.planId } });
    return res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    logger.error('Delete plan error', error);
    return res.status(500).json({ success: false, error: 'Failed to delete plan' });
  }
});
