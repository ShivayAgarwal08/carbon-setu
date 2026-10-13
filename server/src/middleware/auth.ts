import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret-change-me';

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Check Authorization header first, then cookie
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      token = req.signedCookies?.token || req.cookies?.token;
    }

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Verify user still exists and is not deleted
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new AppError('User not found', 401);
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    logger.error('Authentication error', error);
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      token = req.signedCookies?.token || req.cookies?.token;
    }

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, role: true, deletedAt: true },
        });
        if (user && !user.deletedAt) {
          req.userId = user.id;
          req.userRole = user.role;
        }
      }
    }
  } catch {
    // Optional auth - silently continue
  }
  next();
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
