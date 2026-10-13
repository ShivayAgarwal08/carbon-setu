import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export const departmentsRouter = Router();

// GET /api/departments
departmentsRouter.get('/', async (_req, res: Response) => {
  try {
    const departments = await prisma.governmentDepartment.findMany({
      include: {
        contacts: { where: { isVerified: true } },
        _count: { select: { records: true } },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: departments });
  } catch (error) {
    logger.error('Get departments error', error);
    return res.status(500).json({ success: false, error: 'Failed to get departments' });
  }
});

// GET /api/departments/:id
departmentsRouter.get('/:id', async (req, res: Response) => {
  try {
    const dept = await prisma.governmentDepartment.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: true,
        records: {
          where: { status: 'PUBLISHED' },
          select: { id: true, title: true, slug: true, shortDescription: true, category: true, recordType: true },
        },
      },
    });
    if (!dept) return res.status(404).json({ success: false, error: 'Department not found' });
    return res.json({ success: true, data: dept });
  } catch (error) {
    logger.error('Get department error', error);
    return res.status(500).json({ success: false, error: 'Failed to get department' });
  }
});
