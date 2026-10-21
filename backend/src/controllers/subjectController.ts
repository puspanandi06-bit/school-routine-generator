import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getSubjects(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { search, isActive } = req.query;

  const whereClause: any = { schoolId };

  if (isActive !== undefined) {
    whereClause.isActive = isActive === 'true';
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { name: { contains: search } },
      { code: { contains: search } }
    ];
  }

  const subjects = await prisma.subject.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    include: {
      teacherAssignments: {
        include: { teacher: true }
      },
      classRequirements: {
        include: { class: true }
      },
      _count: {
        select: { timetableEntries: true }
      }
    }
  });

  return res.json({ success: true, subjects });
}

export async function getSubjectById(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const subject = await prisma.subject.findFirst({
    where: { id, schoolId },
    include: {
      teacherAssignments: { include: { teacher: true } },
      classRequirements: { include: { class: true } }
    }
  });

  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }

  return res.json({ success: true, subject });
}

export async function createSubject(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { name, code, color, requiresConsecutive, preferredPeriodsPerDay } = req.body;

  const existing = await prisma.subject.findFirst({
    where: { schoolId, name }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Subject with name "${name}" already exists.`
    });
  }

  const subject = await prisma.subject.create({
    data: {
      schoolId,
      name,
      code,
      color: color || '#3b82f6',
      requiresConsecutive: !!requiresConsecutive,
      preferredPeriodsPerDay: parseInt(preferredPeriodsPerDay, 10) || 1
    }
  });

  return res.status(201).json({
    success: true,
    message: 'Subject created successfully',
    subject
  });
}

export async function updateSubject(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;
  const { name, code, color, requiresConsecutive, preferredPeriodsPerDay, isActive } = req.body;

  const existing = await prisma.subject.findFirst({ where: { id, schoolId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }

  const updated = await prisma.subject.update({
    where: { id },
    data: {
      name,
      code,
      color,
      requiresConsecutive: requiresConsecutive !== undefined ? !!requiresConsecutive : undefined,
      preferredPeriodsPerDay: preferredPeriodsPerDay ? parseInt(preferredPeriodsPerDay, 10) : undefined,
      isActive
    }
  });

  return res.json({
    success: true,
    message: 'Subject updated successfully',
    subject: updated
  });
}

export async function deleteSubject(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const existing = await prisma.subject.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { timetableEntries: true } } }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }

  if (existing._count.timetableEntries > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete subject "${existing.name}" because it is part of ${existing._count.timetableEntries} timetable entries in saved routines. Deactivate the subject or remove the routines first.`
    });
  }

  await prisma.subject.delete({ where: { id } });

  return res.json({
    success: true,
    message: 'Subject deleted successfully'
  });
}
