import { Router } from 'express';
import {
  getAssignments,
  createAssignment,
  deleteAssignment,
  batchUpdateTeacherSubjects
} from '../controllers/assignmentController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const assignmentSchema = z.object({
  teacherId: z.string().uuid(),
  subjectId: z.string().uuid(),
  classId: z.string().uuid().optional().nullable()
});

const batchSchema = z.object({
  teacherId: z.string().uuid(),
  subjectIds: z.array(z.string().uuid())
});

router.get('/', authenticate, getAssignments);
router.post('/', authenticate, validateBody(assignmentSchema), createAssignment);
router.delete('/:id', authenticate, deleteAssignment);
router.post('/batch', authenticate, validateBody(batchSchema), batchUpdateTeacherSubjects);

export default router;
