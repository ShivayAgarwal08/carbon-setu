import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const feedbackRouter = Router();

const feedbackSchema = z.object({
  recordId: z.string().optional(),
  type: z.enum(['outdated', 'incorrect', 'broken_link', 'general', 'suggestion']),
  message: z.string().min(10, 'Please provide more detail').max(2000),
});

// POST /api/feedback
feedbackRouter.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = feedbackSchema.parse(req.body);

    if (data.recordId) {
      const record = await prisma.governmentRecord.findUnique({ where: { id: data.recordId } });
      if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const feedback = await prisma.feedbackReport.create({
      data: {
        userId: req.userId || null,
        recordId: data.recordId || null,
        type: data.type,
        message: data.message,
      },
    });

    return res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Feedback error', error);
    return res.status(500).json({ success: false, error: 'Failed to submit feedback' });
  }
});
