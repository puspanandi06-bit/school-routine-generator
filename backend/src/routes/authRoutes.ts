import { Router } from 'express';
import { login, logout, getMe, setupInitialAdmin, updateProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const setupSchema = z.object({
  schoolName: z.string().min(2),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  academicYear: z.string().optional()
});

router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.post('/setup', validateBody(setupSchema), setupInitialAdmin);
router.patch('/profile', authenticate, updateProfile);

export default router;
