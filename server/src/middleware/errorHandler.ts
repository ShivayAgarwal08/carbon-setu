import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { statusCode: err.statusCode });
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Prisma errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    logger.error('Database error', err);
    return res.status(400).json({
      success: false,
      error: 'A database error occurred. Please check your request.',
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: JSON.parse(err.message),
    });
  }

  logger.error('Unhandled error', err);
  
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    success: false,
    error: isDev ? err.message : 'An unexpected error occurred.',
  });
}
