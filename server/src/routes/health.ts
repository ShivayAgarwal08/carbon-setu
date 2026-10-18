import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { getGeminiDiagnostics } from '../services/gemini';
import { getRagStats } from '../services/rag';
import { bhashiniService } from '../services/bhashini';
import { isWhatsAppConfigured } from './whatsapp';
import { VERIFIED_PUBLIC_AUTHORITIES } from './rti';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
    });
  } catch {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

healthRouter.get('/diagnostics', async (_req, res) => {
  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;

  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  const geminiDiag = getGeminiDiagnostics();
  const ragStats = getRagStats();
  const bhashiniStatus = bhashiniService.getStatus();
  const whatsappConfigured = isWhatsAppConfigured();

  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    system: {
      database: {
        provider: 'Neon PostgreSQL (Serverless)',
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      aiEngine: {
        provider: geminiDiag.provider,
        status: geminiDiag.configured ? 'live_configured' : 'fallback_heuristic_mode',
        configuredModel: geminiDiag.model,
        sdk: geminiDiag.sdkVersion,
        hasServerKey: geminiDiag.hasKey,
      },
      ragKnowledgeBase: {
        status: ragStats.isInitialized ? 'active' : 'idle',
        indexedStatutoryChunks: ragStats.totalChunks,
        officialDocumentsCovered: ragStats.totalDocuments,
        schemesCovered: ragStats.schemesCovered,
      },
      multilingualSpeech: {
        provider: bhashiniStatus.provider,
        bhashiniConfigured: bhashiniStatus.configured,
        browserSpeechFallback: bhashiniStatus.browserSpeechSupported,
        supportedLanguages: bhashiniStatus.supportedLanguages,
      },
      messaging: {
        whatsAppCloudApi: whatsappConfigured ? 'live_configured' : 'disabled_unconfigured',
        webhookActive: whatsappConfigured,
      },
      statutoryRtiEngine: {
        status: 'active',
        verifiedPublicAuthorities: VERIFIED_PUBLIC_AUTHORITIES.length,
        supportedStatutes: ['RTI Act 2005 Sec 6(1)', 'RTI Act 2005 Sec 19(1)'],
      },
      applicationGenerator: {
        status: 'active',
        supportedTemplates: ['PM-KISAN', 'Ayushman Bharat PM-JAY', 'Generic Scheme'],
      },
    },
  });
});

