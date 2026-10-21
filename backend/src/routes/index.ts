import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import schoolRoutes from './schoolRoutes';
import classRoutes from './classRoutes';
import teacherRoutes from './teacherRoutes';
import subjectRoutes from './subjectRoutes';
import assignmentRoutes from './assignmentRoutes';
import scheduleConfigRoutes from './scheduleConfigRoutes';
import timetableRoutes from './timetableRoutes';
import exportRoutes from './exportRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/school', schoolRoutes);
router.use('/classes', classRoutes);
router.use('/teachers', teacherRoutes);
router.use('/subjects', subjectRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/schedules', scheduleConfigRoutes);
router.use('/timetables', timetableRoutes);
router.use('/export', exportRoutes);

export default router;
