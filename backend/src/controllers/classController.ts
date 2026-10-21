import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getClasses(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { classType, search, isActive } = req.query;

  const whereClause: any = { schoolId };

  if (classType && (classType === 'NORMAL' || classType === 'PROVISIONAL')) {
    whereClause.classType = classType;
  }

  if (isActive !== undefined) {
    whereClause.isActive = isActive === 'true';
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { name: { contains: search } },
      { section: { contains: search } },
      { roomNumber: { contains: search } }
    ];
  }

  const classes = await prisma.class.findMany({
    where: whereClause,
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
    include: {
      subjectRequirements: {
        include: {
          subject: true
        }
      },
      _count: {
        select: { timetableEntries: true }
      }
    }
  });

  return res.json({ success: true, classes });
}

export async function getClassById(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const cls = await prisma.class.findFirst({
    where: { id, schoolId },
    include: {
      subjectRequirements: {
        include: { subject: true }
      },
      teacherAssignments: {
        include: { teacher: true, subject: true }
      }
    }
  });

  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }

  return res.json({ success: true, class: cls });
}

export async function createClass(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { name, section, academicYear, classType, roomNumber } = req.body;

  // Check unique constraint
  const existing = await prisma.class.findFirst({
    where: {
      schoolId,
      name,
      section,
      academicYear: academicYear || '2025-2026',
      classType: classType || 'NORMAL'
    }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: `Class "${name} - ${section}" (${classType || 'NORMAL'}) already exists for academic year ${academicYear || '2025-2026'}.`
    });
  }

  const newClass = await prisma.class.create({
    data: {
      schoolId,
      name,
      section,
      academicYear: academicYear || '2025-2026',
      classType: classType || 'NORMAL',
      roomNumber
    }
  });

  return res.status(201).json({
    success: true,
    message: 'Class created successfully',
    class: newClass
  });
}

export async function updateClass(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;
  const { name, section, academicYear, classType, roomNumber, isActive } = req.body;

  const existing = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }

  const updated = await prisma.class.update({
    where: { id },
    data: {
      name,
      section,
      academicYear,
      classType,
      roomNumber,
      isActive
    }
  });

  return res.json({
    success: true,
    message: 'Class updated successfully',
    class: updated
  });
}

export async function deleteClass(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const existing = await prisma.class.findFirst({
    where: { id, schoolId },
    include: { _count: { select: { timetableEntries: true } } }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }

  if (existing._count.timetableEntries > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete class "${existing.name} - ${existing.section}" because it has ${existing._count.timetableEntries} timetable entries in saved routines. Deactivate the class or remove the routines first.`
    });
  }

  await prisma.class.delete({ where: { id } });

  return res.json({
    success: true,
    message: 'Class deleted successfully'
  });
}

export async function setClassRequirements(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params; // classId
  const { requirements } = req.body; // array of { subjectId, periodsPerWeek }

  const cls = await prisma.class.findFirst({ where: { id, schoolId } });
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }

  // Delete existing and re-insert in transaction
  await prisma.$transaction(async (tx) => {
    await tx.classSubjectRequirement.deleteMany({ where: { classId: id } });
    if (Array.isArray(requirements) && requirements.length > 0) {
      await tx.classSubjectRequirement.createMany({
        data: requirements.map((r: any) => ({
          schoolId,
          classId: id,
          subjectId: r.subjectId,
          periodsPerWeek: parseInt(r.periodsPerWeek, 10) || 1
        }))
      });
    }
  });

  const updatedReqs = await prisma.classSubjectRequirement.findMany({
    where: { classId: id },
    include: { subject: true }
  });

  return res.json({
    success: true,
    message: 'Subject requirements updated successfully',
    requirements: updatedReqs
  });
}
