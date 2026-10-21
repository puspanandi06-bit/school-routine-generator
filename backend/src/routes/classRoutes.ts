import { Router } from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  setClassRequirements
} from '../controllers/classController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const classSchema = z.object({
  name: z.string().min(1),
  section: z.string().min(1),
  academicYear: z.string().optional(),
  classType: z.enum(['NORMAL', 'PROVISIONAL']).default('NORMAL'),
  roomNumber: z.string().optional().nullable()
});

const requirementsSchema = z.object({
  requirements: z.array(
    z.object({
      subjectId: z.string().uuid(),
      periodsPerWeek: z.number().int().min(1).max(40)
    })
  )
});

router.get('/', authenticate, getClasses);
router.get('/:id', authenticate, getClassById);
router.post('/', authenticate, validateBody(classSchema), createClass);
router.patch('/:id', authenticate, updateClass);
router.delete('/:id', authenticate, deleteClass);
router.post('/:id/requirements', authenticate, validateBody(requirementsSchema), setClassRequirements);

export default router;
