import { Router } from 'express';
import {
  preflightValidate,
  generateTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  updateTimetableEntry,
  swapTimetableEntries,
  clearTimetableEntry,
  validateExistingTimetable
} from '../controllers/timetableController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const preflightSchema = z.object({
  classIds: z.array(z.string().uuid()).min(1),
  scheduleConfigId: z.string().uuid(),
  timetableType: z.enum(['NORMAL', 'PROVISIONAL']).default('NORMAL')
});

const generateSchema = z.object({
  title: z.string().optional(),
  classIds: z.array(z.string().uuid()).min(1),
  scheduleConfigId: z.string().uuid(),
  timetableType: z.enum(['NORMAL', 'PROVISIONAL']).default('NORMAL'),
  academicYear: z.string().optional(),
  randomSeed: z.number().int().optional(),
  prioritizeBalance: z.boolean().optional()
});

const updateEntrySchema = z.object({
  subjectId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  periodOrder: z.number().int().min(1).optional(),
  isManualOverride: z.boolean().optional(),
  notes: z.string().optional().nullable()
});

const swapSchema = z.object({
  entryId1: z.string().uuid(),
  entryId2: z.string().uuid(),
  allowOverride: z.boolean().optional()
});

router.post('/preflight', authenticate, validateBody(preflightSchema), preflightValidate);
router.post('/generate', authenticate, validateBody(generateSchema), generateTimetable);
router.get('/', authenticate, getTimetables);
router.get('/:id', authenticate, getTimetableById);
router.patch('/:id', authenticate, updateTimetable);
router.delete('/:id', authenticate, deleteTimetable);
router.patch('/:id/entries/:entryId', authenticate, validateBody(updateEntrySchema), updateTimetableEntry);
router.post('/:id/swap', authenticate, validateBody(swapSchema), swapTimetableEntries);
router.delete('/:id/entries/:entryId', authenticate, clearTimetableEntry);
router.post('/:id/validate', authenticate, validateExistingTimetable);

export default router;
