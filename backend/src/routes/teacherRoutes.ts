import { Router } from 'express';
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  setTeacherAvailability
} from '../controllers/teacherController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const teacherSchema = z.object({
  name: z.string().min(2),
  employeeId: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  maxPeriodsPerDay: z.number().int().min(1).max(12).default(5),
  maxPeriodsPerWeek: z.number().int().min(1).max(60).default(25)
});

const availabilitySchema = z.object({
  slots: z.array(
    z.object({
      dayOfWeek: z.number().int().min(1).max(7),
      periodOrder: z.number().int().min(1),
      isAvailable: z.boolean(),
      reason: z.string().optional().nullable()
    })
  )
});

router.get('/', authenticate, getTeachers);
router.get('/:id', authenticate, getTeacherById);
router.post('/', authenticate, validateBody(teacherSchema), createTeacher);
router.patch('/:id', authenticate, updateTeacher);
router.delete('/:id', authenticate, deleteTeacher);
router.post('/:id/availability', authenticate, validateBody(availabilitySchema), setTeacherAvailability);

export default router;
