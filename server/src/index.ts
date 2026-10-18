import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { recordsRouter } from './routes/records';
import { intakeRouter } from './routes/intake';
import { profileRouter } from './routes/profile';
import { savedRouter } from './routes/saved';
import { feedbackRouter } from './routes/feedback';
import { adminRouter } from './routes/admin';
import { departmentsRouter } from './routes/departments';
import { healthRouter } from './routes/health';
import { rtiRouter } from './routes/rti';
import { applicationsRouter } from './routes/applications';
import { whatsappRouter } from './routes/whatsapp';
import { logger } from './utils/logger';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security middleware
app.use(helmet());
app.use(cookieParser(process.env.SESSION_SECRET));

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://carbon-setu-live.vercel.app',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const hostname = new URL(origin).hostname;
      if (allowedOrigins.includes(origin) || hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch {
      // invalid URL
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached, please try again later.' },
});

app.use(generalLimiter);

// Body parsing — Capture raw request buffer for cryptographic HMAC webhook verification
app.use(
  express.json({
    limit: '1mb',
    verify: (req: express.Request, _res: express.Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/records', recordsRouter);
app.use('/api/intake', aiLimiter, intakeRouter);
app.use('/api/profile', profileRouter);
app.use('/api/saved', savedRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/rti', rtiRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/whatsapp', whatsappRouter);

// Error handler
app.use(errorHandler);

// Start server (only when not in test mode)
const isTestEnv = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
if (!isTestEnv) {
  app.listen(PORT, () => {
    logger.info(`CARbon Setu API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not set — AI features will use fallback mode');
    }
    if (!process.env.DATABASE_URL) {
      logger.error('DATABASE_URL not set — database features will fail');
    }
  });
}

export default app;
