import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getDashboardStats(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;

  // 1. Counts
  const [
    totalClasses,
    normalClassesCount,
    provisionalClassesCount,
    totalTeachers,
    totalSubjects,
    totalTimetables,
    recentTimetables,
    lastTimetable
  ] = await Promise.all([
    prisma.class.count({ where: { schoolId, isActive: true } }),
    prisma.class.count({ where: { schoolId, isActive: true, classType: 'NORMAL' } }),
    prisma.class.count({ where: { schoolId, isActive: true, classType: 'PROVISIONAL' } }),
    prisma.teacher.count({ where: { schoolId, isActive: true } }),
    prisma.subject.count({ where: { schoolId, isActive: true } }),
    prisma.timetable.count({ where: { schoolId } }),
    prisma.timetable.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        timetableType: true,
        academicYear: true,
        status: true,
        hasConflicts: true,
        createdAt: true,
        _count: { select: { entries: true } }
      }
    }),
    prisma.timetable.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } }
      }
    })
  ]);

  // 2. Real-time warnings
  const warnings: { type: 'ERROR' | 'WARNING'; message: string; link?: string }[] = [];

  // Check subjects without teachers
  const allSubjects = await prisma.subject.findMany({
    where: { schoolId, isActive: true },
    include: { teacherAssignments: true }
  });
  for (const s of allSubjects) {
    if (s.teacherAssignments.length === 0) {
      warnings.push({
        type: 'ERROR',
        message: `Subject "${s.name}" has no qualified teacher assigned.`,
        link: '/assignments'
      });
    }
  }

  // Check classes without requirements
  const classesWithReqs = await prisma.class.findMany({
    where: { schoolId, isActive: true },
    include: { subjectRequirements: true }
  });
  for (const c of classesWithReqs) {
    if (c.subjectRequirements.length === 0) {
      warnings.push({
        type: 'WARNING',
        message: `Class "${c.name} - ${c.section}" (${c.classType}) has 0 subject period requirements configured.`,
        link: c.classType === 'NORMAL' ? '/normal-classes' : '/provisional-classes'
      });
    }
  }

  // Check teachers without any subjects
  const teachersWithAsgns = await prisma.teacher.findMany({
    where: { schoolId, isActive: true },
    include: { subjectAssignments: true }
  });
  for (const t of teachersWithAsgns) {
    if (t.subjectAssignments.length === 0) {
      warnings.push({
        type: 'WARNING',
        message: `Teacher "${t.name}" has no assigned subjects.`,
        link: '/teachers'
      });
    }
  }

  return res.json({
    success: true,
    stats: {
      totalClasses,
      normalClassesCount,
      provisionalClassesCount,
      totalTeachers,
      totalSubjects,
      totalTimetables,
      lastGenerated: lastTimetable ? {
        id: lastTimetable.id,
        title: lastTimetable.title,
        type: lastTimetable.timetableType,
        academicYear: lastTimetable.academicYear,
        status: lastTimetable.status,
        createdAt: lastTimetable.createdAt,
        totalLessons: lastTimetable._count.entries,
        hasConflicts: lastTimetable.hasConflicts
      } : null,
      recentTimetables,
      warnings
    }
  });
}
