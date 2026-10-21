import { Request, Response } from 'express';
import prisma from '../config/db';
import { TimetableScheduler } from '../algorithms/scheduler';
import { runPreflightValidation } from '../algorithms/diagnostics';
import { GenerationInput } from '../algorithms/types';

// Preflight validation endpoint
export async function preflightValidate(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { classIds, scheduleConfigId, timetableType } = req.body;

  if (!Array.isArray(classIds) || classIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one class must be selected.'
    });
  }

  // Load schedule config
  const config = await prisma.scheduleConfig.findFirst({
    where: { id: scheduleConfigId, schoolId },
    include: { periods: true, breaks: true }
  });

  if (!config) {
    return res.status(404).json({ success: false, message: 'Schedule configuration not found.' });
  }

  // Load classes
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds }, schoolId, isActive: true },
    include: {
      subjectRequirements: {
        include: { subject: true }
      }
    }
  });

  // Extract relevant subject IDs
  const subjectIds = Array.from(
    new Set(classes.flatMap(c => c.subjectRequirements.map(r => r.subjectId)))
  );

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds }, schoolId, isActive: true }
  });

  // Load teachers qualified for these subjects
  const teacherAssignments = await prisma.teacherSubjectAssignment.findMany({
    where: { subjectId: { in: subjectIds }, schoolId }
  });

  const teacherIds = Array.from(new Set(teacherAssignments.map(a => a.teacherId)));
  const teachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds }, schoolId, isActive: true }
  });

  const teacherAvailabilities = await prisma.teacherAvailability.findMany({
    where: { teacherId: { in: teacherIds }, schoolId }
  });

  const workingDays: number[] = JSON.parse(config.workingDays || '[1,2,3,4,5]');

  const input: GenerationInput = {
    classes,
    subjects,
    teachers,
    teacherAssignments,
    classRequirements: classes.flatMap(c => c.subjectRequirements),
    teacherAvailabilities,
    periods: config.periods,
    breaks: config.breaks,
    workingDays
  };

  const validation = runPreflightValidation(input);
  return res.json({ success: true, validation });
}

// Generate Timetable endpoint
export async function generateTimetable(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const {
    title,
    classIds,
    scheduleConfigId,
    timetableType,
    academicYear,
    randomSeed,
    prioritizeBalance
  } = req.body;

  if (!Array.isArray(classIds) || classIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one class must be selected for timetable generation.'
    });
  }

  // Load Schedule Config
  const config = await prisma.scheduleConfig.findFirst({
    where: { id: scheduleConfigId, schoolId },
    include: {
      periods: { orderBy: { order: 'asc' } },
      breaks: { orderBy: { afterPeriod: 'asc' } }
    }
  });

  if (!config) {
    return res.status(404).json({ success: false, message: 'Schedule configuration not found.' });
  }

  // Load Classes with requirements
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds }, schoolId, isActive: true },
    include: {
      subjectRequirements: {
        include: { subject: true }
      }
    }
  });

  const subjectIds = Array.from(
    new Set(classes.flatMap(c => c.subjectRequirements.map(r => r.subjectId)))
  );

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds }, schoolId, isActive: true }
  });

  const teacherAssignments = await prisma.teacherSubjectAssignment.findMany({
    where: { subjectId: { in: subjectIds }, schoolId }
  });

  const teacherIds = Array.from(new Set(teacherAssignments.map(a => a.teacherId)));
  const teachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds }, schoolId, isActive: true }
  });

  const teacherAvailabilities = await prisma.teacherAvailability.findMany({
    where: { teacherId: { in: teacherIds }, schoolId }
  });

  const workingDays: number[] = JSON.parse(config.workingDays || '[1,2,3,4,5]');

  const seed = typeof randomSeed === 'number' && randomSeed > 0
    ? randomSeed
    : Math.floor(Math.random() * 1000000) + 1;

  const generationInput: GenerationInput = {
    classes,
    subjects,
    teachers,
    teacherAssignments,
    classRequirements: classes.flatMap(c => c.subjectRequirements),
    teacherAvailabilities,
    periods: config.periods,
    breaks: config.breaks,
    workingDays,
    options: {
      randomSeed: seed,
      prioritizeBalance: !!prioritizeBalance
    }
  };

  const scheduler = new TimetableScheduler(generationInput);
  const result = scheduler.generate();

  if (!result.success) {
    return res.status(422).json({
      success: false,
      message: 'Failed to generate conflict-free timetable.',
      diagnostics: result.diagnostics,
      metrics: result.metrics,
      seed
    });
  }

  // Save generated routine in a database transaction
  const periodMap = new Map(config.periods.map(p => [p.order, p.id]));

  const createdTimetable = await prisma.$transaction(async (tx) => {
    const timetable = await tx.timetable.create({
      data: {
        schoolId,
        scheduleConfigId,
        title: title || `${timetableType || 'Normal'} Routine ${new Date().toLocaleDateString()}`,
        timetableType: timetableType || 'NORMAL',
        academicYear: academicYear || config.periods[0] ? '2025-2026' : '2025-2026',
        status: 'DRAFT',
        randomSeed: seed,
        hasConflicts: false,
        generationDiagnostics: JSON.stringify({
          metrics: result.metrics,
          diagnostics: result.diagnostics
        })
      }
    });

    const entriesData = result.lessons.map(l => ({
      timetableId: timetable.id,
      classId: l.classId,
      subjectId: l.subjectId,
      teacherId: l.teacherId,
      dayOfWeek: l.dayOfWeek,
      periodOrder: l.periodOrder,
      periodId: periodMap.get(l.periodOrder) || null,
      isManualOverride: false
    }));

    await tx.timetableEntry.createMany({
      data: entriesData
    });

    return timetable;
  });

  return res.status(201).json({
    success: true,
    message: 'Timetable generated and saved successfully',
    timetableId: createdTimetable.id,
    metrics: result.metrics,
    seed
  });
}

// Get all timetables
export async function getTimetables(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { timetableType, academicYear, status } = req.query;

  const whereClause: any = { schoolId };
  if (timetableType) whereClause.timetableType = timetableType as string;
  if (academicYear) whereClause.academicYear = academicYear as string;
  if (status) whereClause.status = status as string;

  const timetables = await prisma.timetable.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      scheduleConfig: {
        select: { id: true, name: true, scheduleType: true, periodsPerDay: true }
      },
      _count: {
        select: { entries: true }
      }
    }
  });

  return res.json({ success: true, timetables });
}

// Get single timetable with full details
export async function getTimetableById(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const timetable = await prisma.timetable.findFirst({
    where: { id, schoolId },
    include: {
      scheduleConfig: {
        include: {
          periods: { orderBy: { order: 'asc' } },
          breaks: { orderBy: { afterPeriod: 'asc' } }
        }
      },
      entries: {
        include: {
          class: true,
          subject: true,
          teacher: true,
          period: true
        }
      }
    }
  });

  if (!timetable) {
    return res.status(404).json({ success: false, message: 'Timetable not found' });
  }

  // Get list of distinct classes present in this timetable
  const classIds = Array.from(new Set(timetable.entries.map(e => e.classId)));
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } }
  });

  // Get list of distinct teachers present in this timetable
  const teacherIds = Array.from(new Set(timetable.entries.map(e => e.teacherId)));
  const teachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds } }
  });

  return res.json({
    success: true,
    timetable,
    classes,
    teachers
  });
}

// Update timetable metadata
export async function updateTimetable(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;
  const { title, status, academicYear } = req.body;

  const existing = await prisma.timetable.findFirst({ where: { id, schoolId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Timetable not found' });
  }

  const updated = await prisma.timetable.update({
    where: { id },
    data: {
      title,
      status,
      academicYear
    }
  });

  return res.json({
    success: true,
    message: 'Timetable updated successfully',
    timetable: updated
  });
}

// Delete timetable
export async function deleteTimetable(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const existing = await prisma.timetable.findFirst({ where: { id, schoolId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Timetable not found' });
  }

  await prisma.timetable.delete({ where: { id } });

  return res.json({
    success: true,
    message: 'Timetable deleted successfully'
  });
}

// Update or Move a single timetable entry with strict conflict validation
export async function updateTimetableEntry(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id, entryId } = req.params;
  const {
    subjectId,
    teacherId,
    dayOfWeek,
    periodOrder,
    isManualOverride,
    notes
  } = req.body;

  const timetable = await prisma.timetable.findFirst({
    where: { id, schoolId },
    include: { scheduleConfig: { include: { periods: true } } }
  });

  if (!timetable) {
    return res.status(404).json({ success: false, message: 'Timetable not found' });
  }

  const currentEntry = await prisma.timetableEntry.findFirst({
    where: { id: entryId, timetableId: id }
  });

  if (!currentEntry) {
    return res.status(404).json({ success: false, message: 'Timetable entry not found' });
  }

  const targetDay = dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : currentEntry.dayOfWeek;
  const targetPeriodOrder = periodOrder !== undefined ? parseInt(periodOrder, 10) : currentEntry.periodOrder;
  const targetTeacherId = teacherId || currentEntry.teacherId;
  const targetSubjectId = subjectId || currentEntry.subjectId;
  const classId = currentEntry.classId;

  // Validation checks unless explicit override is provided
  const conflicts: string[] = [];

  // 1. Check Class Double-Booking (excluding current entry)
  const classConflict = await prisma.timetableEntry.findFirst({
    where: {
      timetableId: id,
      classId,
      dayOfWeek: targetDay,
      periodOrder: targetPeriodOrder,
      id: { not: entryId }
    },
    include: { subject: true }
  });
  if (classConflict) {
    conflicts.push(`Class conflict: Class already has "${classConflict.subject.name}" in Day ${targetDay}, Period ${targetPeriodOrder}.`);
  }

  // 2. Check Teacher Double-Booking (excluding current entry)
  const teacherConflict = await prisma.timetableEntry.findFirst({
    where: {
      timetableId: id,
      teacherId: targetTeacherId,
      dayOfWeek: targetDay,
      periodOrder: targetPeriodOrder,
      id: { not: entryId }
    },
    include: { class: true }
  });
  if (teacherConflict) {
    conflicts.push(`Teacher conflict: Teacher is already scheduled with "${teacherConflict.class.name} - ${teacherConflict.class.section}" in Day ${targetDay}, Period ${targetPeriodOrder}.`);
  }

  // 3. Teacher Qualification Check
  const qualification = await prisma.teacherSubjectAssignment.findFirst({
    where: {
      schoolId,
      teacherId: targetTeacherId,
      subjectId: targetSubjectId,
      OR: [{ classId: null }, { classId }]
    }
  });
  if (!qualification) {
    conflicts.push(`Qualification mismatch: Selected teacher is not qualified/assigned to teach this subject.`);
  }

  // 4. Teacher Availability Check
  const availability = await prisma.teacherAvailability.findFirst({
    where: {
      schoolId,
      teacherId: targetTeacherId,
      dayOfWeek: targetDay,
      periodOrder: targetPeriodOrder,
      isAvailable: false
    }
  });
  if (availability) {
    conflicts.push(`Availability violation: Teacher is marked unavailable for Day ${targetDay}, Period ${targetPeriodOrder}${availability.reason ? ` (${availability.reason})` : ''}.`);
  }

  if (conflicts.length > 0 && !isManualOverride) {
    return res.status(409).json({
      success: false,
      message: 'Cannot update entry due to scheduling conflicts.',
      conflicts,
      canOverride: true
    });
  }

  // Find matching period ID
  const period = timetable.scheduleConfig.periods.find(p => p.order === targetPeriodOrder);

  const updatedEntry = await prisma.timetableEntry.update({
    where: { id: entryId },
    data: {
      dayOfWeek: targetDay,
      periodOrder: targetPeriodOrder,
      teacherId: targetTeacherId,
      subjectId: targetSubjectId,
      periodId: period ? period.id : null,
      isManualOverride: !!isManualOverride,
      notes: notes !== undefined ? notes : currentEntry.notes
    },
    include: {
      class: true,
      subject: true,
      teacher: true,
      period: true
    }
  });

  // If override was applied, flag timetable as having overrides
  if (isManualOverride && conflicts.length > 0) {
    await prisma.timetable.update({
      where: { id },
      data: {
        hasConflicts: true,
        conflictDetails: JSON.stringify(conflicts)
      }
    });
  }

  return res.json({
    success: true,
    message: isManualOverride && conflicts.length > 0
      ? 'Entry saved with administrative override.'
      : 'Timetable entry updated successfully.',
    entry: updatedEntry,
    conflicts: conflicts.length > 0 ? conflicts : undefined
  });
}

// Swap two lessons or move lesson
export async function swapTimetableEntries(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;
  const { entryId1, entryId2, allowOverride } = req.body;

  const timetable = await prisma.timetable.findFirst({ where: { id, schoolId } });
  if (!timetable) {
    return res.status(404).json({ success: false, message: 'Timetable not found' });
  }

  const [e1, e2] = await Promise.all([
    prisma.timetableEntry.findFirst({ where: { id: entryId1, timetableId: id } }),
    prisma.timetableEntry.findFirst({ where: { id: entryId2, timetableId: id } })
  ]);

  if (!e1 || !e2) {
    return res.status(404).json({ success: false, message: 'One or both timetable entries not found.' });
  }

  // Swap day and period
  await prisma.$transaction(async (tx) => {
    // Temp placeholder to avoid unique constraint collision
    await tx.timetableEntry.update({
      where: { id: e1.id },
      data: { dayOfWeek: 99, periodOrder: 99 }
    });

    await tx.timetableEntry.update({
      where: { id: e2.id },
      data: {
        dayOfWeek: e1.dayOfWeek,
        periodOrder: e1.periodOrder,
        periodId: e1.periodId
      }
    });

    await tx.timetableEntry.update({
      where: { id: e1.id },
      data: {
        dayOfWeek: e2.dayOfWeek,
        periodOrder: e2.periodOrder,
        periodId: e2.periodId,
        isManualOverride: !!allowOverride
      }
    });
  });

  return res.json({
    success: true,
    message: 'Entries swapped successfully'
  });
}

// Clear a lesson cell
export async function clearTimetableEntry(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id, entryId } = req.params;

  const existing = await prisma.timetableEntry.findFirst({
    where: { id: entryId, timetableId: id }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Entry not found' });
  }

  await prisma.timetableEntry.delete({ where: { id: entryId } });

  return res.json({
    success: true,
    message: 'Lesson removed from slot'
  });
}

// Validate entire existing routine
export async function validateExistingTimetable(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const timetable = await prisma.timetable.findFirst({
    where: { id, schoolId },
    include: {
      entries: {
        include: { class: true, teacher: true, subject: true }
      }
    }
  });

  if (!timetable) {
    return res.status(404).json({ success: false, message: 'Timetable not found' });
  }

  const conflicts: string[] = [];

  // Check double-booking for classes
  const classSlotMap = new Map<string, any>();
  for (const e of timetable.entries) {
    const key = `${e.classId}-${e.dayOfWeek}-${e.periodOrder}`;
    if (classSlotMap.has(key)) {
      conflicts.push(`Class Double-Booking: ${e.class.name} ${e.class.section} has multiple subjects in Day ${e.dayOfWeek}, Period ${e.periodOrder}.`);
    } else {
      classSlotMap.set(key, e);
    }
  }

  // Check double-booking for teachers
  const teacherSlotMap = new Map<string, any>();
  for (const e of timetable.entries) {
    const key = `${e.teacherId}-${e.dayOfWeek}-${e.periodOrder}`;
    if (teacherSlotMap.has(key)) {
      const other = teacherSlotMap.get(key);
      conflicts.push(`Teacher Double-Booking: Teacher ${e.teacher.name} scheduled for both ${other.class.name} and ${e.class.name} in Day ${e.dayOfWeek}, Period ${e.periodOrder}.`);
    } else {
      teacherSlotMap.set(key, e);
    }
  }

  const hasConflicts = conflicts.length > 0;
  await prisma.timetable.update({
    where: { id },
    data: {
      hasConflicts,
      conflictDetails: hasConflicts ? JSON.stringify(conflicts) : null
    }
  });

  return res.json({
    success: true,
    isValid: !hasConflicts,
    hasConflicts,
    conflicts
  });
}
