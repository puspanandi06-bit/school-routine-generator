export interface ClassInput {
  id: string;
  name: string;
  section: string;
  classType: string; // 'NORMAL' | 'PROVISIONAL'
  academicYear: string;
  isActive: boolean;
}

export interface SubjectInput {
  id: string;
  name: string;
  code?: string | null;
  color?: string;
  requiresConsecutive?: boolean;
  preferredPeriodsPerDay?: number;
  isActive: boolean;
}

export interface TeacherInput {
  id: string;
  name: string;
  employeeId?: string | null;
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  isActive: boolean;
}

export interface TeacherAssignmentInput {
  teacherId: string;
  subjectId: string;
  classId?: string | null; // null = any class
}

export interface ClassRequirementInput {
  classId: string;
  subjectId: string;
  periodsPerWeek: number;
}

export interface TeacherAvailabilityInput {
  teacherId: string;
  dayOfWeek: number; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  periodOrder: number;
  isAvailable: boolean;
}

export interface PeriodInput {
  id: string;
  order: number;
  name: string;
  startTime: string;
  endTime: string;
  isUnavailable: boolean;
  type: string; // 'TEACHING' | 'ASSEMBLY' | 'ACTIVITY'
}

export interface BreakInput {
  id?: string;
  name: string;
  afterPeriod: number;
  startTime: string;
  endTime: string;
}

export interface GenerationInput {
  classes: ClassInput[];
  subjects: SubjectInput[];
  teachers: TeacherInput[];
  teacherAssignments: TeacherAssignmentInput[];
  classRequirements: ClassRequirementInput[];
  teacherAvailabilities: TeacherAvailabilityInput[];
  periods: PeriodInput[];
  breaks: BreakInput[];
  workingDays: number[]; // e.g. [1, 2, 3, 4, 5, 6]
  options?: GenerationOptions;
}

export interface GenerationOptions {
  randomSeed?: number;
  maxBacktracks?: number;
  timeoutMs?: number;
  prioritizeBalance?: boolean; // true = balanced teacher workload, false = subject distribution
  allowRelaxation?: boolean;
}

export interface ScheduledLesson {
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  periodOrder: number;
  periodId?: string;
  isManualOverride?: boolean;
}

export interface DiagnosticIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  classId?: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  subjectId?: string;
  subjectName?: string;
  details?: Record<string, any>;
}

export interface PreflightValidationResult {
  isValid: boolean;
  canProceed: boolean;
  issues: DiagnosticIssue[];
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

export interface ScheduleMetrics {
  totalLessonsScheduled: number;
  classesCount: number;
  teachersCount: number;
  backtrackCount: number;
  executionTimeMs: number;
  softConstraintScore: number;
  subjectSpreadScore: number;
  teacherBalanceScore: number;
}

export interface GenerationResult {
  success: boolean;
  timetableType: string;
  seed: number;
  lessons: ScheduledLesson[];
  diagnostics: DiagnosticIssue[];
  metrics: ScheduleMetrics;
}
