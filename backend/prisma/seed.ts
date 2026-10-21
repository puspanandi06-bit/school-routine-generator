import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Smart School Routine Generator Database ---');

  // 1. Create or get School
  let school = await prisma.school.findFirst();
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'St. Paul Academic High School',
        code: 'SPA-2025',
        address: '100 University Avenue, Academic Valley',
        phone: '+1 (555) 234-5678',
        email: 'info@stpaulacademic.edu',
        academicYear: '2025-2026'
      }
    });
    console.log(`Created School: ${school.name}`);
  }

  // 2. Admin User
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const adminEmail = 'admin@school.edu';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN'
      }
    });
    console.log(`Created Admin: ${admin.email} (Password: Admin@123456)`);
  }

  // 3. Normal Schedule Config (Periods & Breaks)
  let normalConfig = await prisma.scheduleConfig.findFirst({
    where: { schoolId: school.id, scheduleType: 'NORMAL' }
  });
  if (!normalConfig) {
    normalConfig = await prisma.scheduleConfig.create({
      data: {
        schoolId: school.id,
        name: 'Standard Weekly Schedule',
        scheduleType: 'NORMAL',
        isDefault: true,
        workingDays: JSON.stringify([1, 2, 3, 4, 5]), // Mon-Fri
        periodsPerDay: 7,
        periods: {
          create: [
            { order: 1, name: 'Period 1', startTime: '08:30 AM', endTime: '09:15 AM', type: 'TEACHING' },
            { order: 2, name: 'Period 2', startTime: '09:15 AM', endTime: '10:00 AM', type: 'TEACHING' },
            { order: 3, name: 'Period 3', startTime: '10:15 AM', endTime: '11:00 AM', type: 'TEACHING' },
            { order: 4, name: 'Period 4', startTime: '11:00 AM', endTime: '11:45 AM', type: 'TEACHING' },
            { order: 5, name: 'Period 5', startTime: '12:30 PM', endTime: '01:15 PM', type: 'TEACHING' },
            { order: 6, name: 'Period 6', startTime: '01:15 PM', endTime: '02:00 PM', type: 'TEACHING' },
            { order: 7, name: 'Period 7', startTime: '02:00 PM', endTime: '02:45 PM', type: 'TEACHING' }
          ]
        },
        breaks: {
          create: [
            { name: 'Morning Break', afterPeriod: 2, startTime: '10:00 AM', endTime: '10:15 AM', durationMinutes: 15 },
            { name: 'Lunch Break', afterPeriod: 4, startTime: '11:45 AM', endTime: '12:30 PM', durationMinutes: 45 }
          ]
        }
      }
    });
    console.log(`Created Normal Schedule Config: ${normalConfig.name}`);
  }

  // 4. Provisional Schedule Config
  let provisionalConfig = await prisma.scheduleConfig.findFirst({
    where: { schoolId: school.id, scheduleType: 'PROVISIONAL' }
  });
  if (!provisionalConfig) {
    provisionalConfig = await prisma.scheduleConfig.create({
      data: {
        schoolId: school.id,
        name: 'Provisional Remedial Schedule',
        scheduleType: 'PROVISIONAL',
        isDefault: false,
        workingDays: JSON.stringify([1, 2, 3, 4, 5, 6]), // Mon-Sat
        periodsPerDay: 4,
        periods: {
          create: [
            { order: 1, name: 'Slot 1', startTime: '09:00 AM', endTime: '09:50 AM', type: 'TEACHING' },
            { order: 2, name: 'Slot 2', startTime: '09:50 AM', endTime: '10:40 AM', type: 'TEACHING' },
            { order: 3, name: 'Slot 3', startTime: '11:00 AM', endTime: '11:50 AM', type: 'TEACHING' },
            { order: 4, name: 'Slot 4', startTime: '11:50 AM', endTime: '12:40 PM', type: 'TEACHING' }
          ]
        },
        breaks: {
          create: [
            { name: 'Recess', afterPeriod: 2, startTime: '10:40 AM', endTime: '11:00 AM', durationMinutes: 20 }
          ]
        }
      }
    });
    console.log(`Created Provisional Schedule Config: ${provisionalConfig.name}`);
  }

  // 5. Subjects
  const subjectsData = [
    { name: 'Mathematics', code: 'MATH', color: '#2563eb', requiresConsecutive: false, preferredPeriodsPerDay: 1 },
    { name: 'English Language', code: 'ENG', color: '#059669', requiresConsecutive: false, preferredPeriodsPerDay: 1 },
    { name: 'Science & Physics', code: 'SCI', color: '#7c3aed', requiresConsecutive: true, preferredPeriodsPerDay: 1 },
    { name: 'Social Studies & History', code: 'SST', color: '#d97706', requiresConsecutive: false, preferredPeriodsPerDay: 1 },
    { name: 'Computer Science', code: 'CS', color: '#0284c7', requiresConsecutive: true, preferredPeriodsPerDay: 1 },
    { name: 'Physical Education & Sports', code: 'PE', color: '#ea580c', requiresConsecutive: false, preferredPeriodsPerDay: 1 },
    { name: 'Art & Design', code: 'ART', color: '#db2777', requiresConsecutive: false, preferredPeriodsPerDay: 1 }
  ];

  const subjectsMap = new Map<string, any>();
  for (const s of subjectsData) {
    let subj = await prisma.subject.findFirst({
      where: { schoolId: school.id, name: s.name }
    });
    if (!subj) {
      subj = await prisma.subject.create({
        data: {
          schoolId: school.id,
          name: s.name,
          code: s.code,
          color: s.color,
          requiresConsecutive: s.requiresConsecutive,
          preferredPeriodsPerDay: s.preferredPeriodsPerDay
        }
      });
    }
    subjectsMap.set(s.name, subj);
  }
  console.log(`Ensured ${subjectsMap.size} Subjects.`);

  // 6. Teachers
  const teachersData = [
    { name: 'Dr. Sarah Jenkins', employeeId: 'EMP-01', email: 'sarah.jenkins@school.edu', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 25, subjects: ['Mathematics'] },
    { name: 'Ms. Emily Bronte', employeeId: 'EMP-02', email: 'emily.bronte@school.edu', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 25, subjects: ['English Language'] },
    { name: 'Prof. Alan Turing', employeeId: 'EMP-03', email: 'alan.turing@school.edu', maxPeriodsPerDay: 4, maxPeriodsPerWeek: 20, subjects: ['Computer Science', 'Mathematics'] },
    { name: 'Mr. Isaac Newton', employeeId: 'EMP-04', email: 'isaac.newton@school.edu', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 24, subjects: ['Science & Physics'] },
    { name: 'Mrs. Clara Barton', employeeId: 'EMP-05', email: 'clara.barton@school.edu', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 22, subjects: ['Social Studies & History'] },
    { name: 'Coach David Miller', employeeId: 'EMP-06', email: 'david.miller@school.edu', maxPeriodsPerDay: 4, maxPeriodsPerWeek: 18, subjects: ['Physical Education & Sports'] },
    { name: 'Ms. Frida Kahlo', employeeId: 'EMP-07', email: 'frida.kahlo@school.edu', maxPeriodsPerDay: 4, maxPeriodsPerWeek: 20, subjects: ['Art & Design'] },
    { name: 'Mr. James Watson', employeeId: 'EMP-08', email: 'james.watson@school.edu', maxPeriodsPerDay: 5, maxPeriodsPerWeek: 24, subjects: ['Science & Physics', 'Mathematics'] }
  ];

  const teachersMap = new Map<string, any>();
  for (const t of teachersData) {
    let teacher = await prisma.teacher.findFirst({
      where: { schoolId: school.id, email: t.email }
    });
    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: {
          schoolId: school.id,
          name: t.name,
          employeeId: t.employeeId,
          email: t.email,
          maxPeriodsPerDay: t.maxPeriodsPerDay,
          maxPeriodsPerWeek: t.maxPeriodsPerWeek
        }
      });
    }
    teachersMap.set(t.name, teacher);

    // Subject assignments
    for (const subName of t.subjects) {
      const subj = subjectsMap.get(subName);
      if (subj) {
        const existingAsgn = await prisma.teacherSubjectAssignment.findFirst({
          where: { schoolId: school.id, teacherId: teacher.id, subjectId: subj.id }
        });
        if (!existingAsgn) {
          await prisma.teacherSubjectAssignment.create({
            data: {
              schoolId: school.id,
              teacherId: teacher.id,
              subjectId: subj.id
            }
          });
        }
      }
    }
  }
  console.log(`Ensured ${teachersMap.size} Teachers and Subject Assignments.`);

  // 7. Normal Classes
  const normalClassesData = [
    { name: 'Class 8', section: 'A', roomNumber: 'Room 101' },
    { name: 'Class 8', section: 'B', roomNumber: 'Room 102' },
    { name: 'Class 9', section: 'A', roomNumber: 'Room 201' },
    { name: 'Class 10', section: 'A', roomNumber: 'Room 301' }
  ];

  const normalRequirements = [
    { subject: 'Mathematics', periods: 6 },
    { subject: 'English Language', periods: 6 },
    { subject: 'Science & Physics', periods: 6 },
    { subject: 'Social Studies & History', periods: 5 },
    { subject: 'Computer Science', periods: 4 },
    { subject: 'Physical Education & Sports', periods: 2 },
    { subject: 'Art & Design', periods: 2 }
  ]; // Total = 31 periods per week (fits within 5 days * 7 periods = 35 slots)

  for (const c of normalClassesData) {
    let cls = await prisma.class.findFirst({
      where: { schoolId: school.id, name: c.name, section: c.section, classType: 'NORMAL' }
    });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          schoolId: school.id,
          name: c.name,
          section: c.section,
          roomNumber: c.roomNumber,
          academicYear: '2025-2026',
          classType: 'NORMAL'
        }
      });
    }

    // Requirements
    for (const req of normalRequirements) {
      const subj = subjectsMap.get(req.subject);
      if (subj) {
        const existingReq = await prisma.classSubjectRequirement.findUnique({
          where: { classId_subjectId: { classId: cls.id, subjectId: subj.id } }
        });
        if (!existingReq) {
          await prisma.classSubjectRequirement.create({
            data: {
              schoolId: school.id,
              classId: cls.id,
              subjectId: subj.id,
              periodsPerWeek: req.periods
            }
          });
        }
      }
    }
  }
  console.log(`Ensured 4 Normal Classes with subject requirements.`);

  // 8. Provisional Classes
  const provisionalClassesData = [
    { name: 'Remedial Batch', section: 'R1', roomNumber: 'Lab A' },
    { name: 'Exam Intensive', section: 'P1', roomNumber: 'Lab B' }
  ];

  const provisionalRequirements = [
    { subject: 'Mathematics', periods: 6 },
    { subject: 'English Language', periods: 6 },
    { subject: 'Science & Physics', periods: 6 },
    { subject: 'Computer Science', periods: 4 }
  ]; // Total = 22 periods per week (fits in 6 days * 4 periods = 24 slots)

  for (const c of provisionalClassesData) {
    let cls = await prisma.class.findFirst({
      where: { schoolId: school.id, name: c.name, section: c.section, classType: 'PROVISIONAL' }
    });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          schoolId: school.id,
          name: c.name,
          section: c.section,
          roomNumber: c.roomNumber,
          academicYear: '2025-2026',
          classType: 'PROVISIONAL'
        }
      });
    }

    for (const req of provisionalRequirements) {
      const subj = subjectsMap.get(req.subject);
      if (subj) {
        const existingReq = await prisma.classSubjectRequirement.findUnique({
          where: { classId_subjectId: { classId: cls.id, subjectId: subj.id } }
        });
        if (!existingReq) {
          await prisma.classSubjectRequirement.create({
            data: {
              schoolId: school.id,
              classId: cls.id,
              subjectId: subj.id,
              periodsPerWeek: req.periods
            }
          });
        }
      }
    }
  }
  console.log(`Ensured 2 Provisional Classes with subject requirements.`);

  console.log('--- Database seeding completed successfully! ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
