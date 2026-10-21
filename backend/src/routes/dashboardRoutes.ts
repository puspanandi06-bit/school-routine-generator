import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.get('/', authenticate, getDashboardStats);
router.get('/stats', authenticate, getDashboardStats);

export default router;
