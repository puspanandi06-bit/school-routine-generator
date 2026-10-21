import { Router } from 'express';
import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
} from '../controllers/subjectController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
  requiresConsecutive: z.boolean().default(false),
  preferredPeriodsPerDay: z.number().int().min(1).max(5).default(1)
});

router.get('/', authenticate, getSubjects);
router.get('/:id', authenticate, getSubjectById);
router.post('/', authenticate, validateBody(subjectSchema), createSubject);
router.patch('/:id', authenticate, updateSubject);
router.delete('/:id', authenticate, deleteSubject);

export default router;
