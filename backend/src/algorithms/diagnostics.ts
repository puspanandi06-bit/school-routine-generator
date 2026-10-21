import {
  GenerationInput,
  PreflightValidationResult,
  DiagnosticIssue
} from './types';

export function runPreflightValidation(input: GenerationInput): PreflightValidationResult {
  const issues: DiagnosticIssue[] = [];
  const {
    classes,
    subjects,
    teachers,
    teacherAssignments,
    classRequirements,
    teacherAvailabilities,
    periods,
    workingDays
  } = input;

  const activeClasses = classes.filter(c => c.isActive);
  const activeSubjects = new Map(subjects.filter(s => s.isActive).map(s => [s.id, s]));
  const activeTeachers = new Map(teachers.filter(t => t.isActive).map(t => [t.id, t]));

  // Calculate available teaching slots per day
  const teachingPeriods = periods.filter(p => !p.isUnavailable && p.type === 'TEACHING');
  const periodsPerDay = teachingPeriods.length;
  const numDays = workingDays.length;
  const totalAvailableSlotsPerClass = periodsPerDay * numDays;

  if (activeClasses.length === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_ACTIVE_CLASSES',
      message: 'No active classes selected for timetable generation.'
    });
  }

  if (numDays === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_WORKING_DAYS',
      message: 'No working days configured in the schedule.'
    });
  }

  if (periodsPerDay === 0) {
    issues.push({
      severity: 'ERROR',
      code: 'NO_TEACHING_PERIODS',
      message: 'No available teaching periods configured in the schedule.'
    });
  }

  // Teacher qualified subjects lookup: teacherId -> Set of subjectIds
  const teacherQualifications = new Map<string, Set<string>>();
  // Subject eligible teachers: subjectId -> Set of teacherIds (optionally filtered by class)
  const subjectTeachers = new Map<string, Set<string>>();

  for (const asgn of teacherAssignments) {
    if (!activeTeachers.has(asgn.teacherId) || !activeSubjects.has(asgn.subjectId)) {
      continue;
    }
    if (!teacherQualifications.has(asgn.teacherId)) {
      teacherQualifications.set(asgn.teacherId, new Set());
    }
    teacherQualifications.get(asgn.teacherId)!.add(asgn.subjectId);

    if (!subjectTeachers.has(asgn.subjectId)) {
      subjectTeachers.set(asgn.subjectId, new Set());
    }
    subjectTeachers.get(asgn.subjectId)!.add(asgn.teacherId);
  }

  // Teacher availability map: teacherId -> Map<"day-period", boolean>
  const teacherUnavailability = new Map<string, Set<string>>();
  for (const avail of teacherAvailabilities) {
    if (!avail.isAvailable) {
      if (!teacherUnavailability.has(avail.teacherId)) {
        teacherUnavailability.set(avail.teacherId, new Set());
      }
      teacherUnavailability.get(avail.teacherId)!.add(`${avail.dayOfWeek}-${avail.periodOrder}`);
    }
  }

  let grandTotalRequiredPeriods = 0;
  const classSummaries = [];

  // Track demand per teacher to check workload limits
  // If a subject has only 1 teacher, that teacher MUST teach all those periods
  const minimumTeacherDemand = new Map<string, number>();

  for (const cls of activeClasses) {
    const reqs = classRequirements.filter(r => r.classId === cls.id);
    let classTotalPeriods = 0;
    const unassignedSubjects: string[] = [];

    for (const req of reqs) {
      const subj = activeSubjects.get(req.subjectId);
      if (!subj) continue;

      classTotalPeriods += req.periodsPerWeek;

      // Check if any active teacher can teach this subject (either general or for this class)
      const eligibleForClass = teacherAssignments.filter(
        a => a.subjectId === req.subjectId &&
             activeTeachers.has(a.teacherId) &&
             (a.classId === null || a.classId === undefined || a.classId === cls.id)
      );

      if (eligibleForClass.length === 0) {
        unassignedSubjects.push(subj.name);
        issues.push({
          severity: 'ERROR',
          code: 'UNASSIGNED_SUBJECT',
          message: `Subject "${subj.name}" in class "${cls.name} - ${cls.section}" has no active qualified teacher assigned.`,
          classId: cls.id,
          className: `${cls.name} - ${cls.section}`,
          subjectId: subj.id,
          subjectName: subj.name
        });
      } else if (eligibleForClass.length === 1) {
        const soleTeacherId = eligibleForClass[0].teacherId;
        minimumTeacherDemand.set(
          soleTeacherId,
          (minimumTeacherDemand.get(soleTeacherId) || 0) + req.periodsPerWeek
        );
      }
    }

    grandTotalRequiredPeriods += classTotalPeriods;

    if (classTotalPeriods > totalAvailableSlotsPerClass) {
      issues.push({
        severity: 'ERROR',
        code: 'PERIODS_EXCEED_SLOTS',
        message: `Class "${cls.name} - ${cls.section}" requires ${classTotalPeriods} periods/week, which exceeds the available ${totalAvailableSlotsPerClass} slots (${numDays} days × ${periodsPerDay} periods).`,
        classId: cls.id,
        className: `${cls.name} - ${cls.section}`,
        details: { required: classTotalPeriods, available: totalAvailableSlotsPerClass }
      });
    } else if (classTotalPeriods === 0) {
      issues.push({
        severity: 'WARNING',
        code: 'ZERO_PERIODS_CONFIGURED',
        message: `Class "${cls.name} - ${cls.section}" has 0 required periods configured.`,
        classId: cls.id,
        className: `${cls.name} - ${cls.section}`
      });
    }

    classSummaries.push({
      classId: cls.id,
      className: `${cls.name} - ${cls.section}`,
      requiredPeriods: classTotalPeriods,
      availablePeriods: totalAvailableSlotsPerClass,
      unassignedSubjects
    });
  }

  // Check teacher workload and availability bottlenecks
  for (const [teacherId, demand] of minimumTeacherDemand.entries()) {
    const teacher = activeTeachers.get(teacherId);
    if (!teacher) continue;

    if (demand > teacher.maxPeriodsPerWeek) {
      issues.push({
        severity: 'ERROR',
        code: 'TEACHER_MAX_WEEK_EXCEEDED',
        message: `Teacher "${teacher.name}" is required for at least ${demand} periods/week, exceeding their configured weekly maximum of ${teacher.maxPeriodsPerWeek}.`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        details: { demand, maxPeriodsPerWeek: teacher.maxPeriodsPerWeek }
      });
    }

    // Check teacher total available time slots vs demand
    const unavailSet = teacherUnavailability.get(teacherId) || new Set();
    const totalWorkingSlots = numDays * periodsPerDay;
    const availableSlotsForTeacher = totalWorkingSlots - unavailSet.size;

    if (demand > availableSlotsForTeacher) {
      issues.push({
        severity: 'ERROR',
        code: 'TEACHER_INSUFFICIENT_AVAILABILITY',
        message: `Teacher "${teacher.name}" is only available for ${availableSlotsForTeacher} slots due to time-off/unavailability, but is assigned to teach ${demand} periods.`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        details: { availableSlots: availableSlotsForTeacher, demand }
      });
    }
  }

  const hasErrors = issues.some(i => i.severity === 'ERROR');

  return {
    isValid: !hasErrors,
    canProceed: !hasErrors,
    issues,
    totalRequiredPeriods: grandTotalRequiredPeriods,
    totalAvailablePeriods: totalAvailableSlotsPerClass * activeClasses.length,
    classSummaries
  };
}
