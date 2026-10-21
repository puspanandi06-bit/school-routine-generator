import { Router } from 'express';
import { exportTimetableCSV } from '../controllers/exportController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.get('/:id/csv', authenticate, exportTimetableCSV);

export default router;
