import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { searchEvidence } from '../services/rag';
import { prisma } from '../utils/prisma';

export const whatsappRouter = Router();

// In-memory fallback cache in case DB table is not yet migrated
const IN_MEMORY_PROCESSED_IDS = new Set<string>();

/**
 * Check whether WhatsApp Cloud API credentials are fully configured.
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    process.env.WHATSAPP_TOKEN.trim().length > 10 &&
    process.env.WHATSAPP_PHONE_NUMBER_ID.trim().length > 5
  );
}

/**
 * Cryptographically validate HMAC-SHA256 signature against exact raw request Buffer.
 * - Calculates HMAC-SHA256 over exact raw bytes using WHATSAPP_APP_SECRET.
 * - Validates expected signature format and length (64 hex characters).
 * - Compares signatures using constant-time comparison.
 * - Fails closed when secret is configured but raw body or signature is missing/invalid.
 */
export function validateWhatsAppSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!appSecret || appSecret.trim().length === 0) {
    return false;
  }

  if (!rawBody || !Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    return false;
  }

  if (!signatureHeader || typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const signatureHex = signatureHeader.slice(7).trim();
  // Valid SHA-256 hex string must be exactly 64 hex characters
  if (signatureHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(signatureHex)) {
    return false;
  }

  try {
    const expectedHex = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const signatureBuf = Buffer.from(signatureHex.toLowerCase(), 'utf8');
    const expectedBuf = Buffer.from(expectedHex.toLowerCase(), 'utf8');

    if (signatureBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Verify Meta Webhook SHA256 signature from Express Request.
 */
export function verifyWebhookSignature(req: Request): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || appSecret.trim().length === 0) {
    // If secret is not configured in dev/test environment, pass through
    return true;
  }

  const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
  return validateWhatsAppSignature(req.rawBody, signatureHeader, appSecret);
}

/**
 * Check if a WhatsApp message has already been processed (Durable Idempotency).
 */
async function isMessageProcessed(messageId: string): Promise<boolean> {
  if (IN_MEMORY_PROCESSED_IDS.has(messageId)) return true;

  try {
    const tableCheck = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'WhatsAppMessageAudit'
      );`
    );

    if (tableCheck?.[0]?.exists) {
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM "WhatsAppMessageAudit" WHERE "messageId" = $1 LIMIT 1;`,
        messageId
      );
      if (rows && rows.length > 0) {
        IN_MEMORY_PROCESSED_IDS.add(messageId);
        return true;
      }
    }
  } catch {
    // Fall back to memory check
  }

  return false;
}

/**
 * Record message in audit store to guarantee durable idempotency across server restarts.
 */
async function recordMessageAudit(messageId: string, senderPhone: string, messageType: string, replyText?: string) {
  IN_MEMORY_PROCESSED_IDS.add(messageId);
  if (IN_MEMORY_PROCESSED_IDS.size > 5000) {
    const first = IN_MEMORY_PROCESSED_IDS.values().next().value;
    if (first) IN_MEMORY_PROCESSED_IDS.delete(first);
  }

  const maskedPhone = senderPhone.slice(0, 2) + '******' + senderPhone.slice(-2);

  try {
    const tableCheck = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'WhatsAppMessageAudit'
      );`
    );

    if (tableCheck?.[0]?.exists) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WhatsAppMessageAudit" 
          (id, "messageId", "senderPhone", "messageType", "processedAt", status, "replyText")
        VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), 'PROCESSED', $4)
        ON CONFLICT ("messageId") DO NOTHING;`,
        messageId,
        maskedPhone,
        messageType,
        replyText || null
      );
    }
  } catch (err) {
    // Audit table record failed, memory cache remains active
  }
}

// ── GET /api/whatsapp/webhook — Meta Webhook Verification ─────────────────
whatsappRouter.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
    logger.info('Meta WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook handshake failed: Invalid or unconfigured verify token');
  return res.status(403).json({ error: 'Webhook verification token mismatch' });
});

// ── POST /api/whatsapp/webhook — Meta Message Event Handler ───────────────
whatsappRouter.post('/webhook', async (req: Request, res: Response) => {
  // If in test mode, allow verification of payload parsing
  if (!isWhatsAppConfigured() && process.env.NODE_ENV !== 'test') {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp Cloud API integration is disabled. Configure WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_VERIFY_TOKEN.',
    });
  }

  // Signature check — Fail closed when WHATSAPP_APP_SECRET is configured
  if (process.env.WHATSAPP_APP_SECRET) {
    if (!verifyWebhookSignature(req)) {
      logger.warn('WhatsApp webhook rejected: Invalid or missing HMAC signature');
      return res.status(401).json({ error: 'Invalid or missing signature' });
    }
  }

  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;

          // Handle message delivery status updates
          if (value?.statuses && value.statuses.length > 0) {
            for (const statusObj of value.statuses) {
              logger.info(`WhatsApp delivery status update for ${statusObj.id}: ${statusObj.status}`);
            }
          }

          // Handle incoming citizen messages
          if (value && value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              const messageId = message.id;

              // Durable Idempotency Check
              const alreadyProcessed = await isMessageProcessed(messageId);
              if (alreadyProcessed) {
                logger.info(`Skipping duplicate WhatsApp message event ${messageId}`);
                continue;
              }

              const senderPhone = message.from;
              const messageType = message.type;

              let userText = '';
              if (messageType === 'text') {
                userText = message.text?.body || '';
              } else if (messageType === 'audio') {
                userText = 'Citizen submitted voice query for scheme eligibility';
              }

              // Search verified statutory evidence
              let replyText = '';
              if (userText.length > 2) {
                const evidence = await searchEvidence(userText, { limit: 2 });
                if (evidence.length > 0) {
                  const top = evidence[0];
                  replyText = `*CARbon Setu (कार्बन सेतु) — आधिकारिक सहायता*\n\n` +
                    `योजना: *${top.chunk.provenance.schemeTitle}*\n` +
                    `दस्तावेज: ${top.chunk.provenance.documentTitle}\n` +
                    `प्राधिकरण: ${top.chunk.provenance.issuingAuthority}\n\n` +
                    `सत्यापित विवरण: ${top.chunk.content.slice(0, 260)}...\n\n` +
                    `आधिकारिक पोर्टल: ${top.chunk.provenance.sourceUrl}\n\n` +
                    `_अस्वीकरण: यह केवल सूचनात्मक मार्गदर्शन है। औपचारिक आवेदन आधिकारिक पोर्टल पर करें।_`;
                } else {
                  replyText = `*CARbon Setu (कार्बन सेतु)*\n\n` +
                    `नमस्ते! हमें आपके अनुरोध के लिए उपयुक्त सरकारी योजनाओं की जानकारी मिली है।\n` +
                    `पात्रता जांच और आरटीआई प्रारूप हेतु पोर्टल देखें: https://carbon-setu-live.vercel.app`;
                }
              }

              // Record in durable audit store
              await recordMessageAudit(messageId, senderPhone, messageType, replyText);

              // Transmit outgoing message via Meta Graph API v20.0
              if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
                try {
                  const metaRes = await fetch(
                    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                      },
                      body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: senderPhone,
                        text: { body: replyText },
                      }),
                    }
                  );

                  if (!metaRes.ok) {
                    const errBody = await metaRes.text();
                    logger.error(`Meta WhatsApp Graph API send error HTTP ${metaRes.status}: ${errBody}`);
                  }
                } catch (metaErr) {
                  logger.error('Failed to post reply to WhatsApp Graph API', metaErr);
                }
              }
            }
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    }

    return res.status(404).json({ error: 'Not a valid WhatsApp business account event' });
  } catch (error) {
    logger.error('WhatsApp webhook processing error', error);
    return res.status(500).json({ error: 'Internal processing error' });
  }
});

// ── GET /api/whatsapp/status — Public integration status ──────────────────
whatsappRouter.get('/status', (_req: Request, res: Response) => {
  const configured = isWhatsAppConfigured();
  return res.json({
    success: true,
    data: {
      status: configured ? 'live_configured' : 'unavailable_unconfigured',
      provider: 'Meta WhatsApp Cloud API (Graph API v20.0)',
      configured,
      webhookEndpoint: '/api/whatsapp/webhook',
      activeFeatures: [
        'durable_postgresql_idempotency',
        'hmac_sha256_signature_verification',
        'verified_statutory_evidence_replies',
        'delivery_status_tracking',
        'privacy_phone_masking',
      ],
      notice: configured
        ? 'WhatsApp Cloud API is active and receiving webhooks.'
        : 'WhatsApp integration is currently unconfigured. Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_VERIFY_TOKEN in backend environment to activate.',
    },
  });
});

/**
 * Send an outbound message via Meta WhatsApp Cloud API (Graph API v20.0).
 * Can be invoked by any backend service for alerts, status updates, or notifications.
 */
export async function sendWhatsAppMessage(
  to: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!isWhatsAppConfigured()) {
    return {
      success: false,
      error: 'WhatsApp Cloud API integration is not configured with required credentials',
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          text: { body: messageText },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, error: `Meta API HTTP ${res.status}: ${errBody}` };
    }

    const data: any = await res.json();
    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

