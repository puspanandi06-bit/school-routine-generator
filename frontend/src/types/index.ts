export interface School {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  academicYear: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  school: School;
}

export interface ClassItem {
  id: string;
  schoolId: string;
  name: string;
  section: string;
  academicYear: string;
  classType: 'NORMAL' | 'PROVISIONAL';
  roomNumber?: string | null;
  isActive: boolean;
  subjectRequirements?: ClassRequirement[];
  _count?: {
    timetableEntries: number;
  };
}

export interface SubjectItem {
  id: string;
  schoolId: string;
  name: string;
  code?: string | null;
  color: string;
  requiresConsecutive: boolean;
  preferredPeriodsPerDay: number;
  isActive: boolean;
  teacherAssignments?: TeacherAssignment[];
  classRequirements?: ClassRequirement[];
  _count?: {
    timetableEntries: number;
  };
}

export interface TeacherItem {
  id: string;
  schoolId: string;
  name: string;
  employeeId?: string | null;
  email?: string | null;
  phone?: string | null;
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  isActive: boolean;
  subjectAssignments?: TeacherAssignment[];
  availabilities?: TeacherAvailability[];
  _count?: {
    timetableEntries: number;
  };
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId?: string | null;
  teacher?: TeacherItem;
  subject?: SubjectItem;
  class?: ClassItem | null;
}

export interface ClassRequirement {
  id: string;
  classId: string;
  subjectId: string;
  periodsPerWeek: number;
  subject?: SubjectItem;
  class?: ClassItem;
}

export interface TeacherAvailability {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  periodOrder: number;
  isAvailable: boolean;
  reason?: string | null;
}

export interface PeriodItem {
  id: string;
  scheduleConfigId: string;
  name: string;
  order: number;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
  type: 'TEACHING' | 'ASSEMBLY' | 'ACTIVITY';
}

export interface BreakItem {
  id: string;
  scheduleConfigId: string;
  name: string;
  afterPeriod: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface ScheduleConfigItem {
  id: string;
  schoolId: string;
  name: string;
  scheduleType: 'NORMAL' | 'PROVISIONAL';
  isDefault: boolean;
  workingDays: string; // JSON string
  periodsPerDay: number;
  periods: PeriodItem[];
  breaks: BreakItem[];
  _count?: {
    timetables: number;
  };
}

export interface TimetableEntryItem {
  id: string;
  timetableId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  periodOrder: number;
  periodId?: string | null;
  isManualOverride: boolean;
  notes?: string | null;
  class: ClassItem;
  subject: SubjectItem;
  teacher: TeacherItem;
  period?: PeriodItem | null;
}

export interface TimetableItem {
  id: string;
  schoolId: string;
  scheduleConfigId: string;
  title: string;
  timetableType: 'NORMAL' | 'PROVISIONAL';
  academicYear: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  randomSeed?: number | null;
  hasConflicts: boolean;
  conflictDetails?: string | null;
  generationDiagnostics?: string | null;
  createdAt: string;
  updatedAt: string;
  scheduleConfig?: ScheduleConfigItem;
  entries?: TimetableEntryItem[];
  _count?: {
    entries: number;
  };
}

export interface PreflightDiagnosticIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  className?: string;
  teacherName?: string;
  subjectName?: string;
  details?: Record<string, any>;
}

export interface PreflightResponse {
  isValid: boolean;
  canProceed: boolean;
  issues: PreflightDiagnosticIssue[];
  totalRequiredPeriods: number;
  totalAvailablePeriods: number;
  classSummaries: {
    classId: string;
    className: string;
    requiredPeriods: number;
    availablePeriods: number;
    unassignedSubjects: string[];
  }[];
}
