import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getAssignments(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { teacherId, subjectId, classId } = req.query;

  const whereClause: any = { schoolId };
  if (teacherId) whereClause.teacherId = teacherId as string;
  if (subjectId) whereClause.subjectId = subjectId as string;
  if (classId) whereClause.classId = classId as string;

  const assignments = await prisma.teacherSubjectAssignment.findMany({
    where: whereClause,
    include: {
      teacher: true,
      subject: true,
      class: true
    },
    orderBy: [
      { teacher: { name: 'asc' } },
      { subject: { name: 'asc' } }
    ]
  });

  return res.json({ success: true, assignments });
}

export async function createAssignment(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { teacherId, subjectId, classId } = req.body;

  // Check if teacher and subject exist and belong to school
  const [teacher, subject] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, schoolId } }),
    prisma.subject.findFirst({ where: { id: subjectId, schoolId } })
  ]);

  if (!teacher || !subject) {
    return res.status(404).json({ success: false, message: 'Teacher or Subject not found' });
  }

  // Check duplicate
  const existing = await prisma.teacherSubjectAssignment.findFirst({
    where: {
      schoolId,
      teacherId,
      subjectId,
      classId: classId || null
    }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'This teacher-subject assignment already exists.'
    });
  }

  const assignment = await prisma.teacherSubjectAssignment.create({
    data: {
      schoolId,
      teacherId,
      subjectId,
      classId: classId || null
    },
    include: {
      teacher: true,
      subject: true,
      class: true
    }
  });

  return res.status(201).json({
    success: true,
    message: 'Teacher assigned to subject successfully',
    assignment
  });
}

export async function deleteAssignment(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;

  const existing = await prisma.teacherSubjectAssignment.findFirst({
    where: { id, schoolId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  await prisma.teacherSubjectAssignment.delete({ where: { id } });

  return res.json({
    success: true,
    message: 'Assignment removed successfully'
  });
}

export async function batchUpdateTeacherSubjects(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { teacherId, subjectIds } = req.body; // subjectIds: string[]

  const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }

  await prisma.$transaction(async (tx) => {
    // Delete general assignments for this teacher
    await tx.teacherSubjectAssignment.deleteMany({
      where: { teacherId, classId: null }
    });

    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      await tx.teacherSubjectAssignment.createMany({
        data: subjectIds.map((sId: string) => ({
          schoolId,
          teacherId,
          subjectId: sId,
          classId: null
        }))
      });
    }
  });

  const updated = await prisma.teacherSubjectAssignment.findMany({
    where: { teacherId },
    include: { subject: true }
  });

  return res.json({
    success: true,
    message: 'Teacher subjects updated successfully',
    assignments: updated
  });
}
