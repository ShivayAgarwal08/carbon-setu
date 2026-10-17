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
  // Extended citizen attributes from frontend
  age: z.union([z.number(), z.string()]).optional(),
  incomeAnnual: z.union([z.number(), z.string()]).optional(),
  casteCategory: z.string().optional(),
  isFarmer: z.boolean().optional(),
  isStudent: z.boolean().optional(),
  isBpl: z.boolean().optional(),
  hasDisability: z.boolean().optional(),
  minorityStatus: z.boolean().optional(),
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

    // Flatten additionalInfo into profile for client convenience
    const mergedProfile = user.profile
      ? {
          ...user.profile,
          ...((user.profile.additionalInfo as Record<string, any>) || {}),
        }
      : null;

    return res.json({
      success: true,
      data: {
        ...user,
        profile: mergedProfile,
        ...(mergedProfile || {}),
      },
    });
  } catch (error) {
    logger.error('Get profile error', error);
    return res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// PUT /api/profile
profileRouter.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const {
      name,
      preferredLang,
      age,
      incomeAnnual,
      casteCategory,
      isFarmer,
      isStudent,
      isBpl,
      hasDisability,
      minorityStatus,
      ...standardProfileData
    } = data;

    const updates: any[] = [];

    if (name || preferredLang) {
      updates.push(
        prisma.user.update({
          where: { id: req.userId },
          data: { ...(name ? { name } : {}), ...(preferredLang ? { preferredLang } : {}) },
        })
      );
    }

    // Pack extended attributes into additionalInfo JSON column
    const extendedAttributes: Record<string, any> = {};
    if (age !== undefined) extendedAttributes.age = typeof age === 'string' ? parseInt(age, 10) || null : age;
    if (incomeAnnual !== undefined) extendedAttributes.incomeAnnual = typeof incomeAnnual === 'string' ? parseInt(incomeAnnual, 10) || null : incomeAnnual;
    if (casteCategory !== undefined) extendedAttributes.casteCategory = casteCategory;
    if (isFarmer !== undefined) extendedAttributes.isFarmer = isFarmer;
    if (isStudent !== undefined) extendedAttributes.isStudent = isStudent;
    if (isBpl !== undefined) extendedAttributes.isBpl = isBpl;
    if (hasDisability !== undefined) extendedAttributes.hasDisability = hasDisability;
    if (minorityStatus !== undefined) extendedAttributes.minorityStatus = minorityStatus;

    // Fetch existing profile to merge additionalInfo
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: req.userId! },
    });

    const mergedAdditionalInfo = {
      ...((existingProfile?.additionalInfo as Record<string, any>) || {}),
      ...extendedAttributes,
    };

    const finalProfileData: any = {
      ...standardProfileData,
      additionalInfo: mergedAdditionalInfo,
    };

    if (casteCategory && !finalProfileData.category) {
      finalProfileData.category = casteCategory;
    }
    if (incomeAnnual && !finalProfileData.incomeRange) {
      finalProfileData.incomeRange = `${incomeAnnual}`;
    }

    updates.push(
      prisma.userProfile.upsert({
        where: { userId: req.userId! },
        update: finalProfileData,
        create: { userId: req.userId!, ...finalProfileData },
      })
    );

    await prisma.$transaction(updates);

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, preferredLang: true, profile: true },
    });

    const flattenedProfile = user?.profile
      ? {
          ...user.profile,
          ...((user.profile.additionalInfo as Record<string, any>) || {}),
        }
      : null;

    return res.json({
      success: true,
      data: {
        ...user,
        profile: flattenedProfile,
        ...(flattenedProfile || {}),
      },
    });
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
