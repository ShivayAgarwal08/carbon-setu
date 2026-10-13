import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth';
import { classifyAndExtract, explainRecommendations, processFollowUp, isGeminiAvailable } from '../services/gemini';
import { rankRecords, UserProfileData } from '../services/eligibility';
import { logger } from '../utils/logger';

export const intakeRouter = Router();

const startSessionSchema = z.object({
  problem: z.string().min(5, 'Please describe your problem in at least a few words').max(2000),
  profile: z.object({
    state: z.string().optional(),
    district: z.string().optional(),
    ageRange: z.string().optional(),
    occupation: z.string().optional(),
    category: z.string().optional(),
    incomeRange: z.string().optional(),
    areaType: z.string().optional(),
    gender: z.string().optional(),
  }).optional(),
});

const followUpSchema = z.object({
  message: z.string().min(1).max(2000),
});

// POST /api/intake/start — Start an intake session
intakeRouter.post('/start', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const data = startSessionSchema.parse(req.body);

    // Classify the problem and extract profile data
    const classification = await classifyAndExtract(data.problem, data.profile || {});

    // Merge extracted profile with provided profile
    const mergedProfile: UserProfileData = {
      ...(data.profile || {}),
      ...classification.extractedProfile,
    };

    // Create the session
    const session = await prisma.intakeSession.create({
      data: {
        userId: req.userId || null,
        initialProblem: data.problem,
        structuredProfile: mergedProfile as any,
        status: 'active',
        messages: {
          create: [
            {
              role: 'user',
              content: data.problem,
              metadata: { profile: data.profile },
            },
            {
              role: 'assistant',
              content: classification.followUpQuestions.length > 0
                ? `I understand you're looking for help with: ${data.problem}. To find the most relevant government schemes for you, I have a few questions:\n\n${classification.followUpQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
                : `I understand you're looking for help with: ${data.problem}. Let me search for relevant government schemes and services.`,
              metadata: {
                classification: {
                  categories: classification.categories,
                  beneficiaryType: classification.beneficiaryType,
                  urgency: classification.urgency,
                },
                missingFields: classification.missingFields,
              },
            },
          ],
        },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    // If we have enough info, also get initial recommendations
    let recommendations = null;
    if (classification.missingFields.filter(f => ['state', 'category', 'occupation'].includes(f)).length === 0) {
      recommendations = await getRecommendations(session.id, data.problem, mergedProfile, classification.categories);
    }

    return res.status(201).json({
      success: true,
      data: {
        session,
        classification: {
          categories: classification.categories,
          beneficiaryType: classification.beneficiaryType,
          missingFields: classification.missingFields,
        },
        recommendations,
        geminiAvailable: isGeminiAvailable(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Intake start error', error);
    return res.status(500).json({ success: false, error: 'Failed to start intake session' });
  }
});

// POST /api/intake/:sessionId/message — Follow-up message
intakeRouter.post('/:sessionId/message', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const data = followUpSchema.parse(req.body);

    const session = await prisma.intakeSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Get conversation history
    const history = session.messages.map(m => ({ role: m.role, content: m.content }));
    const currentProfile = (session.structuredProfile as UserProfileData) || {};

    // Process follow-up
    const result = await processFollowUp(history, data.message, currentProfile);

    // Merge extracted data
    const updatedProfile = { ...currentProfile, ...result.extractedData };

    // Save messages and update profile
    await prisma.$transaction([
      prisma.intakeMessage.create({
        data: { sessionId, role: 'user', content: data.message },
      }),
      prisma.intakeMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: result.response,
          metadata: { extractedData: result.extractedData, isComplete: result.isComplete },
        },
      }),
      prisma.intakeSession.update({
        where: { id: sessionId },
        data: { structuredProfile: updatedProfile as any },
      }),
    ]);

    // If conversation is complete, generate recommendations
    let recommendations = null;
    if (result.isComplete) {
      const classification = await classifyAndExtract(session.initialProblem, updatedProfile);
      recommendations = await getRecommendations(sessionId, session.initialProblem, updatedProfile, classification.categories);

      await prisma.intakeSession.update({
        where: { id: sessionId },
        data: { status: 'completed' },
      });
    }

    const updatedSession = await prisma.intakeSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return res.json({
      success: true,
      data: {
        session: updatedSession,
        response: result.response,
        isComplete: result.isComplete,
        recommendations,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
    }
    logger.error('Intake follow-up error', error);
    return res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// GET /api/intake/:sessionId — Get session with recommendations
intakeRouter.get('/:sessionId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.intakeSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        recommendations: {
          include: { record: { select: { id: true, title: true, slug: true, shortDescription: true, category: true, recordType: true, officialUrl: true, lastVerifiedAt: true } } },
          orderBy: { relevanceScore: 'desc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    return res.json({ success: true, data: session });
  } catch (error) {
    logger.error('Get session error', error);
    return res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

// POST /api/intake/:sessionId/recommend — Generate recommendations for a session
intakeRouter.post('/:sessionId/recommend', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.intakeSession.findUnique({
      where: { id: req.params.sessionId },
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const profile = (session.structuredProfile as UserProfileData) || {};
    const classification = await classifyAndExtract(session.initialProblem, profile);
    const recommendations = await getRecommendations(
      session.id,
      session.initialProblem,
      profile,
      classification.categories
    );

    return res.json({ success: true, data: recommendations });
  } catch (error) {
    logger.error('Recommend error', error);
    return res.status(500).json({ success: false, error: 'Failed to generate recommendations' });
  }
});

// ── Helper: Generate and store recommendations ──────────────────────────

async function getRecommendations(
  sessionId: string,
  problem: string,
  profile: UserProfileData,
  categories: string[]
) {
  // Fetch published records matching categories
  const categoryFilter = categories.length > 0 ? categories : undefined;

  const records = await prisma.governmentRecord.findMany({
    where: {
      status: 'PUBLISHED',
      ...(categoryFilter ? { category: { in: categoryFilter as any } } : {}),
    },
    include: { eligibilityRules: true },
  });

  // Also search by text
  const textRecords = await prisma.governmentRecord.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { title: { contains: problem.split(' ').slice(0, 3).join(' '), mode: 'insensitive' } },
        { shortDescription: { contains: problem.split(' ').slice(0, 3).join(' '), mode: 'insensitive' } },
      ],
    },
    include: { eligibilityRules: true },
  });

  // Merge and deduplicate
  const allRecords = [...records];
  for (const tr of textRecords) {
    if (!allRecords.find(r => r.id === tr.id)) {
      allRecords.push(tr);
    }
  }

  // Rank using eligibility engine
  const ranked = rankRecords(allRecords, profile);

  // Take top results
  const topResults = ranked.slice(0, 8);

  // Delete old recommendations for this session
  await prisma.recommendation.deleteMany({ where: { sessionId } });

  // Store new recommendations
  const savedRecs = [];
  for (const result of topResults) {
    const rec = await prisma.recommendation.create({
      data: {
        sessionId,
        recordId: result.recordId,
        relevanceScore: result.percentage / 100,
        relevanceLabel: result.label,
        matchReasons: result.matchReasons,
        missingInfo: result.missingInfo,
        explanation: null, // Will be filled by AI if available
      },
      include: {
        record: {
          select: {
            id: true, title: true, slug: true, shortDescription: true, detailedDescription: true,
            category: true, recordType: true, benefits: true, eligibilityDetails: true,
            applicationProcess: true, officialUrl: true, requiredDocuments: true,
            sourceUrl: true, lastVerifiedAt: true, stateScope: true, beneficiaries: true,
          },
        },
      },
    });
    savedRecs.push(rec);
  }

  // Generate AI explanation if available
  let aiExplanation = null;
  if (isGeminiAvailable() && topResults.length > 0) {
    try {
      aiExplanation = await explainRecommendations(
        problem,
        profile,
        topResults.map(r => ({
          title: r.record.title,
          shortDescription: r.record.shortDescription,
          detailedDescription: r.record.detailedDescription,
          benefits: r.record.benefits,
          eligibilityDetails: r.record.eligibilityDetails,
          applicationProcess: r.record.applicationProcess,
          officialUrl: r.record.officialUrl,
          requiredDocuments: r.record.requiredDocuments,
          sourceUrl: r.record.sourceUrl,
          lastVerifiedAt: r.record.lastVerifiedAt,
          matchReasons: r.matchReasons,
          missingInfo: r.missingInfo,
          relevanceLabel: r.label,
        }))
      );
    } catch (error) {
      logger.error('AI explanation failed', error);
    }
  }

  return {
    recommendations: savedRecs,
    aiExplanation,
    totalFound: allRecords.length,
    matchedCount: topResults.length,
  };
}
