import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth';
import { generateSchemeApplicationDraft, CitizenApplicationInput } from '../services/applicationGenerator';
import { logger } from '../utils/logger';

export const applicationsRouter = Router();

const applicationRequestSchema = z.object({
  schemeSlug: z.string().min(1),
  schemeTitle: z.string().min(1),
  applicantName: z.string().min(2).max(100),
  fatherOrSpouseName: z.string().optional(),
  dobOrAge: z.string().optional(),
  gender: z.string().optional(),
  category: z.string().optional(),
  occupation: z.string().optional(),
  annualIncome: z.union([z.number(), z.string()]).optional(),
  address: z.string().min(5).max(300),
  district: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().min(4).max(10),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  hasAadhaarLinkedBank: z.boolean().default(false),
  bankAccountDeclaration: z.boolean().default(false),
  landholdingAcres: z.union([z.number(), z.string()]).optional(),
  khasraKhatauniNumber: z.string().optional(),
  preferredLanguage: z.enum(['en', 'hi']).default('en'),
  saveDraft: z.boolean().default(false),
});

// POST /api/applications/generate — Generate application draft
applicationsRouter.post('/generate', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = applicationRequestSchema.parse(req.body);
    const draft = generateSchemeApplicationDraft(data as CitizenApplicationInput);

    let savedDraftId: string | null = null;

    // If user requested to save draft and is authenticated, persist in DB
    if (data.saveDraft && req.userId) {
      const plan = await prisma.savedActionPlan.create({
        data: {
          userId: req.userId,
          title: `Application Draft: ${draft.schemeTitle}`,
          recordId: 'SCHEME_APPLICATION_DRAFT',
          notes: `Official Submission: ${draft.submissionAuthority}`,
          plan: {
            isApplicationDraft: true,
            schemeSlug: draft.schemeSlug,
            schemeTitle: draft.schemeTitle,
            draftText: draft.draftText,
            formData: data,
            missingRequiredFields: draft.missingRequiredFields,
            mandatoryChecklist: draft.mandatoryChecklist,
            submissionInstructions: draft.submissionInstructions,
            officialPortalUrl: draft.officialPortalUrl,
            steps: [
              { order: 1, text: 'Review and verify prefilled applicant details', completed: true },
              { order: 2, text: 'Gather original documents from mandatory checklist', completed: false },
              { order: 3, text: 'Prepare self-attested photocopies of identity & income documents', completed: false },
              { order: 4, text: `Submit officially via ${draft.submissionAuthority} or ${draft.officialPortalUrl}`, completed: false },
              { order: 5, text: 'Secure acknowledgment / tracking receipt from authority', completed: false },
            ],
          } as any,
        },
      });
      savedDraftId = plan.id;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...draft,
        savedDraftId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Application generate error', error);
    return res.status(500).json({ success: false, error: 'Failed to generate application draft' });
  }
});

// GET /api/applications/drafts — List user saved application drafts
applicationsRouter.get('/drafts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const drafts = await prisma.savedActionPlan.findMany({
      where: {
        userId: req.userId!,
        recordId: 'SCHEME_APPLICATION_DRAFT',
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: drafts.map(d => ({
        id: d.id,
        title: d.title,
        notes: d.notes,
        updatedAt: d.updatedAt,
        plan: d.plan,
      })),
    });
  } catch (error) {
    logger.error('Get application drafts error', error);
    return res.status(500).json({ success: false, error: 'Failed to list application drafts' });
  }
});

// GET /api/applications/drafts/:id — Get specific saved application draft
applicationsRouter.get('/drafts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const draft = await prisma.savedActionPlan.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
        recordId: 'SCHEME_APPLICATION_DRAFT',
      },
    });

    if (!draft) {
      return res.status(404).json({ success: false, error: 'Application draft not found or unauthorized' });
    }

    return res.json({ success: true, data: draft });
  } catch (error) {
    logger.error('Get application draft detail error', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch draft details' });
  }
});
