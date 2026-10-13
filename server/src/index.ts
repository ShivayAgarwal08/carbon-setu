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
import { logger } from './utils/logger';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security middleware
app.use(helmet());
app.use(cookieParser(process.env.SESSION_SECRET));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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

// Body parsing
app.use(express.json({ limit: '1mb' }));
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

// Error handler
app.use(errorHandler);

// Start server
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

export default app;
