import { Router } from 'express';
import { getSchool, updateSchool } from '../controllers/schoolController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const schoolSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  academicYear: z.string().min(4)
});

router.get('/', authenticate, getSchool);
router.patch('/', authenticate, validateBody(schoolSchema), updateSchool);

export default router;
