import { Router } from 'express';
import {
  getScheduleConfigs,
  getScheduleConfigById,
  getDefaultScheduleConfig,
  createScheduleConfig,
  updateScheduleConfig,
  deleteScheduleConfig
} from '../controllers/scheduleConfigController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const periodSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(1),
  startTime: z.string(),
  endTime: z.string(),
  isUnavailable: z.boolean().default(false),
  type: z.enum(['TEACHING', 'ASSEMBLY', 'ACTIVITY']).default('TEACHING')
});

const breakSchema = z.object({
  name: z.string().min(1),
  afterPeriod: z.number().int().min(1),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: z.number().int().min(1).default(30)
});

const configSchema = z.object({
  name: z.string().min(2),
  scheduleType: z.enum(['NORMAL', 'PROVISIONAL']).default('NORMAL'),
  isDefault: z.boolean().default(false),
  workingDays: z.array(z.number().int().min(1).max(7)),
  periods: z.array(periodSchema),
  breaks: z.array(breakSchema).default([])
});

router.get('/', authenticate, getScheduleConfigs);
router.get('/default', authenticate, getDefaultScheduleConfig);
router.get('/:id', authenticate, getScheduleConfigById);
router.post('/', authenticate, validateBody(configSchema), createScheduleConfig);
router.patch('/:id', authenticate, updateScheduleConfig);
router.delete('/:id', authenticate, deleteScheduleConfig);

export default router;
