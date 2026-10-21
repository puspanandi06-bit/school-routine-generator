import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getTeachers(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { search, isActive } = req.query;

  const whereClause: any = { schoolId };

  if (isActive !== undefined) {
    whereClause.isActive = isActive === 'true';
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { name: { contains: search } },
      { employeeId: { contains: search } },
      { email: { contains: search } }
    ];
  }

  const teachers = await prisma.teacher.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    include: {
      subjectAssignments: {
        include: {
          subject: true,
          class: true
        }
      },
      availabilities: {
        where: { isAvailable: false }
      },
      _count: {
        select: { timetableEntries: true }
      }
    }
  });

  return res.json({ success: true, teachers });
}

export async function getTeacherById(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const teacher = await prisma.teacher.findFirst({
    where: { id, schoolId },
    include: {
      subjectAssignments: {
        include: { subject: true, class: true }
      },
      availabilities: true
    }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }

  return res.json({ success: true, teacher });
}

export async function createTeacher(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { name, employeeId, email, phone, maxPeriodsPerDay, maxPeriodsPerWeek } = req.body;

  if (email) {
    const existing = await prisma.teacher.findFirst({
      where: { schoolId, email }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Teacher with email ${email} already exists.`
      });
    }
  }

  const teacher = await prisma.teacher.create({
    data: {
      schoolId,
      name,
      employeeId,
      email,
      phone,
      maxPeriodsPerDay: parseInt(maxPeriodsPerDay, 10) || 5,
      maxPeriodsPerWeek: parseInt(maxPeriodsPerWeek, 10) || 25
    }
  });

  return res.status(201).json({
    success: true,
    message: 'Teacher created successfully',
    teacher
  });
}

export async function updateTeacher(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;
  const { name, employeeId, email, phone, maxPeriodsPerDay, maxPeriodsPerWeek, isActive } = req.body;

  const existing = await prisma.teacher.findFirst({ where: { id, schoolId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }

  const updated = await prisma.teacher.update({
    where: { id },
    data: {
      name,
      employeeId,
      email,
      phone,
      maxPeriodsPerDay: maxPeriodsPerDay ? parseInt(maxPeriodsPerDay, 10) : undefined,
      maxPeriodsPerWeek: maxPeriodsPerWeek ? parseInt(maxPeriodsPerWeek, 10) : undefined,
      isActive
    }
  });

  return res.json({
    success: true,
    message: 'Teacher updated successfully',
    teacher: updated
  });
}

export async function deleteTeacher(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const existing = await prisma.teacher.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { timetableEntries: true } } }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }

  if (existing._count.timetableEntries > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete teacher "${existing.name}" because they have ${existing._count.timetableEntries} assigned lessons in saved routines. Deactivate the teacher or remove the routines first.`
    });
  }

  await prisma.teacher.delete({ where: { id } });

  return res.json({
    success: true,
    message: 'Teacher deleted successfully'
  });
}

export async function setTeacherAvailability(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params; // teacherId
  const { slots } = req.body; // array of { dayOfWeek, periodOrder, isAvailable, reason }

  const teacher = await prisma.teacher.findFirst({ where: { id, schoolId } });
  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }

  await prisma.$transaction(async (tx) => {
    // Delete existing availability overrides for this teacher
    await tx.teacherAvailability.deleteMany({ where: { teacherId: id } });

    if (Array.isArray(slots) && slots.length > 0) {
      // Only store unavailabilities (or explicit entries)
      const validSlots = slots.map((s: any) => ({
        schoolId,
        teacherId: id,
        dayOfWeek: parseInt(s.dayOfWeek, 10),
        periodOrder: parseInt(s.periodOrder, 10),
        isAvailable: s.isAvailable !== false,
        reason: s.reason || null
      }));
      await tx.teacherAvailability.createMany({ data: validSlots });
    }
  });

  const updatedAvail = await prisma.teacherAvailability.findMany({
    where: { teacherId: id }
  });

  return res.json({
    success: true,
    message: 'Teacher availability updated successfully',
    availabilities: updatedAvail
  });
}
