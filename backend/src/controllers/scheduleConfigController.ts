import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getScheduleConfigs(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { scheduleType } = req.query;

  const whereClause: any = { schoolId };
  if (scheduleType && (scheduleType === 'NORMAL' || scheduleType === 'PROVISIONAL')) {
    whereClause.scheduleType = scheduleType;
  }

  const configs = await prisma.scheduleConfig.findMany({
    where: whereClause,
    include: {
      periods: { orderBy: { order: 'asc' } },
      breaks: { orderBy: { afterPeriod: 'asc' } },
      _count: { select: { timetables: true } }
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
  });

  return res.json({ success: true, configs });
}

export async function getScheduleConfigById(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const config = await prisma.scheduleConfig.findFirst({
    where: { id, schoolId },
    include: {
      periods: { orderBy: { order: 'asc' } },
      breaks: { orderBy: { afterPeriod: 'asc' } }
    }
  });

  if (!config) {
    return res.status(404).json({ success: false, message: 'Schedule configuration not found' });
  }

  return res.json({ success: true, config });
}

export async function getDefaultScheduleConfig(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const scheduleType = (req.query.scheduleType as string) || 'NORMAL';

  let config = await prisma.scheduleConfig.findFirst({
    where: { schoolId, scheduleType, isDefault: true },
    include: {
      periods: { orderBy: { order: 'asc' } },
      breaks: { orderBy: { afterPeriod: 'asc' } }
    }
  });

  if (!config) {
    config = await prisma.scheduleConfig.findFirst({
      where: { schoolId, scheduleType },
      include: {
        periods: { orderBy: { order: 'asc' } },
        breaks: { orderBy: { afterPeriod: 'asc' } }
      }
    });
  }

  return res.json({ success: true, config });
}

export async function createScheduleConfig(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { name, scheduleType, isDefault, workingDays, periods, breaks } = req.body;

  const config = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      // Unset previous defaults for this scheduleType
      await tx.scheduleConfig.updateMany({
        where: { schoolId, scheduleType, isDefault: true },
        data: { isDefault: false }
      });
    }

    const created = await tx.scheduleConfig.create({
      data: {
        schoolId,
        name,
        scheduleType: scheduleType || 'NORMAL',
        isDefault: !!isDefault,
        workingDays: JSON.stringify(workingDays || [1, 2, 3, 4, 5]),
        periodsPerDay: Array.isArray(periods) ? periods.length : 7,
        periods: {
          create: (periods || []).map((p: any, idx: number) => ({
            name: p.name || `Period ${idx + 1}`,
            order: p.order || idx + 1,
            startTime: p.startTime || '09:00 AM',
            endTime: p.endTime || '09:45 AM',
            isUnavailable: !!p.isUnavailable,
            type: p.type || 'TEACHING'
          }))
        },
        breaks: {
          create: (breaks || []).map((b: any) => ({
            name: b.name,
            afterPeriod: parseInt(b.afterPeriod, 10),
            startTime: b.startTime,
            endTime: b.endTime,
            durationMinutes: parseInt(b.durationMinutes, 10) || 30
          }))
        }
      },
      include: {
        periods: { orderBy: { order: 'asc' } },
        breaks: { orderBy: { afterPeriod: 'asc' } }
      }
    });

    return created;
  });

  return res.status(201).json({
    success: true,
    message: 'Schedule configuration created successfully',
    config
  });
}

export async function updateScheduleConfig(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;
  const { name, scheduleType, isDefault, workingDays, periods, breaks } = req.body;

  const existing = await prisma.scheduleConfig.findFirst({ where: { id, schoolId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Schedule configuration not found' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.scheduleConfig.updateMany({
        where: { schoolId, scheduleType: existing.scheduleType, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    // Replace periods & breaks
    await tx.period.deleteMany({ where: { scheduleConfigId: id } });
    await tx.break.deleteMany({ where: { scheduleConfigId: id } });

    return tx.scheduleConfig.update({
      where: { id },
      data: {
        name,
        scheduleType,
        isDefault: isDefault !== undefined ? !!isDefault : undefined,
        workingDays: workingDays ? JSON.stringify(workingDays) : undefined,
        periodsPerDay: Array.isArray(periods) ? periods.length : undefined,
        periods: {
          create: (periods || []).map((p: any, idx: number) => ({
            name: p.name || `Period ${idx + 1}`,
            order: p.order || idx + 1,
            startTime: p.startTime,
            endTime: p.endTime,
            isUnavailable: !!p.isUnavailable,
            type: p.type || 'TEACHING'
          }))
        },
        breaks: {
          create: (breaks || []).map((b: any) => ({
            name: b.name,
            afterPeriod: parseInt(b.afterPeriod, 10),
            startTime: b.startTime,
            endTime: b.endTime,
            durationMinutes: parseInt(b.durationMinutes, 10) || 30
          }))
        }
      },
      include: {
        periods: { orderBy: { order: 'asc' } },
        breaks: { orderBy: { afterPeriod: 'asc' } }
      }
    });
  });

  return res.json({
    success: true,
    message: 'Schedule configuration updated successfully',
    config: updated
  });
}

export async function deleteScheduleConfig(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const existing = await prisma.scheduleConfig.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { timetables: true } } }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Schedule configuration not found' });
  }

  if (existing._count.timetables > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete configuration because ${existing._count.timetables} saved routines depend on it.`
    });
  }

  await prisma.scheduleConfig.delete({ where: { id } });

  return res.json({
    success: true,
    message: 'Schedule configuration deleted successfully'
  });
}
