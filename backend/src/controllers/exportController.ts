import { Request, Response } from 'express';
import prisma from '../config/db';

export async function exportTimetableCSV(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { id } = req.params;
  const { classId, teacherId, viewType } = req.query;

  const timetable = await prisma.timetable.findFirst({
    where: { id, schoolId },
    include: {
      school: true,
      scheduleConfig: {
        include: {
          periods: { orderBy: { order: 'asc' } },
          breaks: true
        }
      },
      entries: {
        include: {
          class: true,
          subject: true,
          teacher: true,
          period: true
        },
        orderBy: [{ dayOfWeek: 'asc' }, { periodOrder: 'asc' }]
      }
    }
  });

  if (!timetable) {
    return res.status(404).json({ success: false, message: 'Timetable not found' });
  }

  const dayNames: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday'
  };

  let filteredEntries = timetable.entries;
  let filenamePrefix = timetable.title.replace(/[^a-zA-Z0-9-_]/g, '_');

  if (classId) {
    filteredEntries = filteredEntries.filter(e => e.classId === classId);
    const cls = filteredEntries[0]?.class;
    if (cls) filenamePrefix += `_${cls.name}_${cls.section}`;
  } else if (teacherId) {
    filteredEntries = filteredEntries.filter(e => e.teacherId === teacherId);
    const tch = filteredEntries[0]?.teacher;
    if (tch) filenamePrefix += `_${tch.name.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
  }

  // Build CSV rows
  const headers = ['Day', 'Period', 'Time', 'Class', 'Subject', 'Subject Code', 'Teacher', 'Room', 'Override'];
  const rows: string[][] = [headers];

  for (const entry of filteredEntries) {
    const dayStr = dayNames[entry.dayOfWeek] || `Day ${entry.dayOfWeek}`;
    const periodStr = entry.period?.name || `Period ${entry.periodOrder}`;
    const timeStr = entry.period ? `${entry.period.startTime} - ${entry.period.endTime}` : '';
    const classStr = `${entry.class.name} ${entry.class.section}`;
    const subjectStr = entry.subject.name;
    const codeStr = entry.subject.code || '';
    const teacherStr = entry.teacher.name;
    const roomStr = entry.class.roomNumber || '';
    const overrideStr = entry.isManualOverride ? 'Yes' : 'No';

    rows.push([
      dayStr,
      periodStr,
      timeStr,
      classStr,
      subjectStr,
      codeStr,
      teacherStr,
      roomStr,
      overrideStr
    ]);
  }

  // Format CSV escaping quotes
  const csvContent = rows
    .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filenamePrefix}_routine.csv"`);
  return res.status(200).send(csvContent);
}
