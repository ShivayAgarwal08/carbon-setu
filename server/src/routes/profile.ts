import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export const profileRouter = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferredLang: z.enum(['en', 'hi']).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  ageRange: z.string().optional(),
  occupation: z.string().optional(),
  category: z.string().optional(),
  incomeRange: z.string().optional(),
  areaType: z.enum(['rural', 'urban']).optional(),
  gender: z.string().optional(),
  familyDetails: z.string().optional(),
});

// GET /api/profile
profileRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, name: true, role: true, preferredLang: true, createdAt: true,
        profile: true,
      },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Get profile error', error);
    return res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// PUT /api/profile
profileRouter.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const { name, preferredLang, ...profileData } = data;

    const updates: any[] = [];

    if (name || preferredLang) {
      updates.push(
        prisma.user.update({
          where: { id: req.userId },
          data: { ...(name ? { name } : {}), ...(preferredLang ? { preferredLang } : {}) },
        })
      );
    }

    if (Object.keys(profileData).length > 0) {
      updates.push(
        prisma.userProfile.upsert({
          where: { userId: req.userId! },
          update: profileData,
          create: { userId: req.userId!, ...profileData },
        })
      );
    }

    await prisma.$transaction(updates);

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, preferredLang: true, profile: true },
    });

    return res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Update profile error', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// DELETE /api/profile — Account deletion
profileRouter.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Soft delete — mark as deleted but preserve for data integrity
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${req.userId}@deleted.local`,
        name: 'Deleted User',
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
      },
    });

    // Delete personal data
    await prisma.userProfile.deleteMany({ where: { userId: req.userId! } });
    await prisma.savedRecord.deleteMany({ where: { userId: req.userId! } });
    await prisma.savedActionPlan.deleteMany({ where: { userId: req.userId! } });

    res.clearCookie('token');
    return res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error', error);
    return res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});
