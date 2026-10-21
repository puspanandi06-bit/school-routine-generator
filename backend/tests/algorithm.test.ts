import { describe, it, expect } from 'vitest';
import { TimetableScheduler } from '../src/algorithms/scheduler';
import { runPreflightValidation } from '../src/algorithms/diagnostics';
import { GenerationInput } from '../src/algorithms/types';

describe('Timetable Scheduling Algorithm & Diagnostics', () => {
  const mockWorkingDays = [1, 2, 3, 4, 5]; // Mon-Fri
  const mockPeriods = [
    { id: 'p1', order: 1, name: 'P1', startTime: '09:00', endTime: '09:45', isUnavailable: false, type: 'TEACHING' },
    { id: 'p2', order: 2, name: 'P2', startTime: '09:45', endTime: '10:30', isUnavailable: false, type: 'TEACHING' },
    { id: 'p3', order: 3, name: 'P3', startTime: '10:45', endTime: '11:30', isUnavailable: false, type: 'TEACHING' },
    { id: 'p4', order: 4, name: 'P4', startTime: '11:30', endTime: '12:15', isUnavailable: false, type: 'TEACHING' },
    { id: 'p5', order: 5, name: 'P5', startTime: '13:00', endTime: '13:45', isUnavailable: false, type: 'TEACHING' },
  ]; // 5 periods * 5 days = 25 slots

  const mockClasses = [
    { id: 'c1', name: 'Class 8', section: 'A', classType: 'NORMAL', academicYear: '2025-2026', isActive: true },
    { id: 'c2', name: 'Class 8', section: 'B', classType: 'NORMAL', academicYear: '2025-2026', isActive: true },
  ];

  const mockSubjects = [
    { id: 's1', name: 'Math', code: 'MATH', isActive: true },
    { id: 's2', name: 'English', code: 'ENG', isActive: true },
    { id: 's3', name: 'Science', code: 'SCI', isActive: true },
  ];

  const mockTeachers = [
    { id: 't1', name: 'Teacher Math', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 25, isActive: true },
    { id: 't2', name: 'Teacher English', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 25, isActive: true },
    { id: 't3', name: 'Teacher Science', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 25, isActive: true },
  ];

  const mockTeacherAssignments = [
    { teacherId: 't1', subjectId: 's1' },
    { teacherId: 't2', subjectId: 's2' },
    { teacherId: 't3', subjectId: 's3' },
  ];

  const mockRequirements = [
    { classId: 'c1', subjectId: 's1', periodsPerWeek: 5 },
    { classId: 'c1', subjectId: 's2', periodsPerWeek: 5 },
    { classId: 'c1', subjectId: 's3', periodsPerWeek: 5 },
    { classId: 'c2', subjectId: 's1', periodsPerWeek: 5 },
    { classId: 'c2', subjectId: 's2', periodsPerWeek: 5 },
    { classId: 'c2', subjectId: 's3', periodsPerWeek: 5 },
  ]; // Total 15 periods per class, shared teachers t1, t2, t3

  it('generates a valid conflict-free timetable satisfying all hard constraints', () => {
    const input: GenerationInput = {
      classes: mockClasses,
      subjects: mockSubjects,
      teachers: mockTeachers,
      teacherAssignments: mockTeacherAssignments,
      classRequirements: mockRequirements,
      teacherAvailabilities: [],
      periods: mockPeriods,
      breaks: [],
      workingDays: mockWorkingDays,
      options: { randomSeed: 12345 }
    };

    const scheduler = new TimetableScheduler(input);
    const result = scheduler.generate();

    expect(result.success).toBe(true);
    expect(result.lessons.length).toBe(30); // 15 + 15

    // 1. Verify No Class Double-Booking
    const classSlots = new Set<string>();
    for (const l of result.lessons) {
      const key = `${l.classId}-${l.dayOfWeek}-${l.periodOrder}`;
      expect(classSlots.has(key)).toBe(false);
      classSlots.add(key);
    }

    // 2. Verify No Teacher Double-Booking across any classes
    const teacherSlots = new Set<string>();
    for (const l of result.lessons) {
      const key = `${l.teacherId}-${l.dayOfWeek}-${l.periodOrder}`;
      expect(teacherSlots.has(key)).toBe(false);
      teacherSlots.add(key);
    }

    // 3. Verify Exact Required Periods per Class & Subject
    for (const req of mockRequirements) {
      const actualCount = result.lessons.filter(
        l => l.classId === req.classId && l.subjectId === req.subjectId
      ).length;
      expect(actualCount).toBe(req.periodsPerWeek);
    }

    // 4. Verify Teacher Qualifications
    for (const l of result.lessons) {
      const asgn = mockTeacherAssignments.find(
        a => a.teacherId === l.teacherId && a.subjectId === l.subjectId
      );
      expect(asgn).toBeDefined();
    }
  });

  it('respects teacher availability restrictions', () => {
    // Make Teacher Math unavailable on Monday (day 1) all periods (orders 1..5)
    const availabilities = [1, 2, 3, 4, 5].map(periodOrder => ({
      teacherId: 't1',
      dayOfWeek: 1,
      periodOrder,
      isAvailable: false
    }));

    const input: GenerationInput = {
      classes: mockClasses,
      subjects: mockSubjects,
      teachers: mockTeachers,
      teacherAssignments: mockTeacherAssignments,
      classRequirements: mockRequirements,
      teacherAvailabilities: availabilities,
      periods: mockPeriods,
      breaks: [],
      workingDays: mockWorkingDays,
      options: { randomSeed: 999 }
    };

    const scheduler = new TimetableScheduler(input);
    const result = scheduler.generate();

    expect(result.success).toBe(true);

    // Verify Teacher Math was NEVER scheduled on Monday
    const mondayMathLessons = result.lessons.filter(
      l => l.teacherId === 't1' && l.dayOfWeek === 1
    );
    expect(mondayMathLessons.length).toBe(0);
  });

  it('is deterministic when given the same random seed', () => {
    const input: GenerationInput = {
      classes: mockClasses,
      subjects: mockSubjects,
      teachers: mockTeachers,
      teacherAssignments: mockTeacherAssignments,
      classRequirements: mockRequirements,
      teacherAvailabilities: [],
      periods: mockPeriods,
      breaks: [],
      workingDays: mockWorkingDays,
      options: { randomSeed: 42 }
    };

    const run1 = new TimetableScheduler(input).generate();
    const run2 = new TimetableScheduler(input).generate();

    expect(run1.success).toBe(true);
    expect(run2.success).toBe(true);
    expect(run1.lessons).toEqual(run2.lessons);
  });

  it('detects unassigned subjects in preflight diagnostics', () => {
    const input: GenerationInput = {
      classes: [mockClasses[0]],
      subjects: [{ id: 'orphan_subj', name: 'Astronomy', isActive: true }],
      teachers: mockTeachers,
      teacherAssignments: [], // No teacher assigned to Astronomy!
      classRequirements: [{ classId: 'c1', subjectId: 'orphan_subj', periodsPerWeek: 3 }],
      teacherAvailabilities: [],
      periods: mockPeriods,
      breaks: [],
      workingDays: mockWorkingDays
    };

    const diagnostics = runPreflightValidation(input);
    expect(diagnostics.canProceed).toBe(false);
    expect(diagnostics.issues.some(i => i.code === 'UNASSIGNED_SUBJECT')).toBe(true);
  });

  it('detects when required periods exceed available periods', () => {
    const input: GenerationInput = {
      classes: [mockClasses[0]],
      subjects: mockSubjects,
      teachers: mockTeachers,
      teacherAssignments: mockTeacherAssignments,
      classRequirements: [
        { classId: 'c1', subjectId: 's1', periodsPerWeek: 15 },
        { classId: 'c1', subjectId: 's2', periodsPerWeek: 15 } // 30 periods > 25 available slots!
      ],
      teacherAvailabilities: [],
      periods: mockPeriods,
      breaks: [],
      workingDays: mockWorkingDays
    };

    const diagnostics = runPreflightValidation(input);
    expect(diagnostics.canProceed).toBe(false);
    expect(diagnostics.issues.some(i => i.code === 'PERIODS_EXCEED_SLOTS')).toBe(true);
  });
});
