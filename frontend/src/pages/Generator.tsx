import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ScheduleConfigItem, ClassItem, PreflightResponse } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  GraduationCap,
  Sliders,
  Play,
  ArrowRight,
  Layers,
  CalendarCheck
} from 'lucide-react';

export const Generator: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [schedules, setSchedules] = useState<ScheduleConfigItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [timetableType, setTimetableType] = useState<'NORMAL' | 'PROVISIONAL'>('NORMAL');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [title, setTitle] = useState('Standard Academic Routine');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [randomSeed, setRandomSeed] = useState<string>('');
  const [prioritizeBalance, setPrioritizeBalance] = useState(true);

  // Preflight validation state
  const [preflightData, setPreflightData] = useState<PreflightResponse | null>(null);
  const [validatingPreflight, setValidatingPreflight] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any | null>(null);

  // Load schedules and classes
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [schRes, clsRes] = await Promise.all([
          api.get('/schedules'),
          api.get('/classes')
        ]);

        if (schRes.success && schRes.configs.length > 0) {
          setSchedules(schRes.configs);
          const defaultCfg = schRes.configs.find((c: ScheduleConfigItem) => c.isDefault && c.scheduleType === timetableType)
            || schRes.configs.find((c: ScheduleConfigItem) => c.scheduleType === timetableType)
            || schRes.configs[0];
          setSelectedScheduleId(defaultCfg.id);
        }

        if (clsRes.success) {
          setClasses(clsRes.classes);
          // Default select classes of this type
          const initialClassIds = clsRes.classes
            .filter((c: ClassItem) => c.classType === timetableType && c.isActive)
            .map((c: ClassItem) => c.id);
          setSelectedClassIds(initialClassIds);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to initialize generator');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Update selected classes and schedule when type changes
  const handleTypeChange = (type: 'NORMAL' | 'PROVISIONAL') => {
    setTimetableType(type);
    setTitle(type === 'NORMAL' ? 'Standard Academic Routine' : 'Provisional Remedial Schedule');
    
    const matchingCfg = schedules.find((c) => c.scheduleType === type && c.isDefault)
      || schedules.find((c) => c.scheduleType === type)
      || schedules[0];
    if (matchingCfg) {
      setSelectedScheduleId(matchingCfg.id);
    }

    const matchingClassIds = classes
      .filter((c) => c.classType === type && c.isActive)
      .map((c) => c.id);
    setSelectedClassIds(matchingClassIds);
    setPreflightData(null);
  };

  const toggleClassSelect = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
    setPreflightData(null);
  };

  const selectAllClasses = () => {
    const allOfType = classes.filter((c) => c.classType === timetableType && c.isActive).map((c) => c.id);
    setSelectedClassIds(allOfType);
    setPreflightData(null);
  };

  const clearSelectedClasses = () => {
    setSelectedClassIds([]);
    setPreflightData(null);
  };

  // Run Preflight Diagnostic
  const handleRunPreflight = async () => {
    if (!selectedScheduleId || selectedClassIds.length === 0) {
      toast.warning('Please select a schedule configuration and at least one class.');
      return;
    }

    setValidatingPreflight(true);
    try {
      const res = await api.post('/timetables/preflight', {
        scheduleConfigId: selectedScheduleId,
        classIds: selectedClassIds,
        timetableType,
      });

      const val = res.validation || res.preflight;
      if (res.success && val) {
        setPreflightData(val);
        if (val.isValid) {
          toast.success('Preflight checks passed! Schedule constraints are solvable.');
        } else {
          toast.error('Preflight checks found blocking constraint issues.');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Preflight validation failed');
    } finally {
      setValidatingPreflight(false);
    }
  };

  // Run CSP Generation
  const handleGenerate = async () => {
    if (!selectedScheduleId || selectedClassIds.length === 0) {
      toast.warning('Select schedule and classes first.');
      return;
    }

    setIsGenerating(true);
    setGenerationResult(null);

    try {
      const payload: any = {
        title: title.trim() || `${timetableType} Timetable`,
        scheduleConfigId: selectedScheduleId,
        classIds: selectedClassIds,
        timetableType,
        prioritizeBalance,
      };

      if (randomSeed.trim()) {
        payload.randomSeed = parseInt(randomSeed, 10);
      }

      const res = await api.post('/timetables/generate', payload);

      const generatedId = res.timetableId || res.timetable?.id;
      if (res.success && generatedId) {
        setGenerationResult({ id: generatedId, ...res });
        // Confetti celebration
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }
        toast.success('Timetable successfully generated conflict-free!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Timetable generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);
  const eligibleClasses = classes.filter((c) => c.classType === timetableType && c.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Automated Backtracking CSP Scheduler
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Routine Generator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          Zero-conflict automated scheduling with strict teacher-availability hard constraints, laboratory consecutive requirements, and balanced teacher work spacing.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Generator Configuration Form */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Routine Type & Config */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <CardTitle className="text-sm">Schedule Profile & Bells</CardTitle>
                    <CardDescription>Choose schedule template and routine title</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('NORMAL')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      timetableType === 'NORMAL'
                        ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <p className="font-bold text-slate-900 text-sm">NORMAL</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Regular academic weekly routine</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange('PROVISIONAL')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      timetableType === 'PROVISIONAL'
                        ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <p className="font-bold text-slate-900 text-sm">PROVISIONAL</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Remedial or weekend batches</p>
                  </button>
                </div>

                <Input
                  label="Routine Title"
                  required
                  placeholder="e.g. Term 1 Standard Routine 2025-2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <Select
                  label="Schedule Configuration (Periods & Breaks)"
                  value={selectedScheduleId}
                  onChange={(e) => {
                    setSelectedScheduleId(e.target.value);
                    setPreflightData(null);
                  }}
                >
                  {schedules
                    .filter((s) => s.scheduleType === timetableType)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.periodsPerDay} periods/day) {s.isDefault ? '[DEFAULT]' : ''}
                      </option>
                    ))}
                </Select>
              </CardContent>
            </Card>

            {/* Step 2: Class Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <CardTitle className="text-sm">Classes to Schedule ({selectedClassIds.length})</CardTitle>
                      <CardDescription>Select the classes to include in this timetable</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={clearSelectedClasses}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {eligibleClasses.length === 0 ? (
                  <p className="text-xs text-slate-500">No active {timetableType} classes available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {eligibleClasses.map((cls) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      const reqCount = cls.subjectRequirements?.reduce((sum, r) => sum + r.periodsPerWeek, 0) || 0;

                      return (
                        <div
                          key={cls.id}
                          onClick={() => toggleClassSelect(cls.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50/50 shadow-xs ring-1 ring-brand-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div
                              className="w-4 h-4 rounded text-brand-600 border-slate-300"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{cls.name} - {cls.section}</p>
                              <p className="text-[11px] text-slate-400">
                                {cls.roomNumber ? `Room: ${cls.roomNumber}` : 'No room'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {reqCount}p/wk
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Solver Tuning Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <CardTitle className="text-sm">Algorithm Settings</CardTitle>
                    <CardDescription>Soft constraint priorities and reproducibility</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Deterministic Random Seed (Optional)"
                    placeholder="e.g. 42 (Leave empty for fresh seed)"
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(e.target.value)}
                    helperText="Fixed integer produces the exact same schedule"
                  />

                  <div className="flex flex-col justify-center pt-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prioritizeBalance}
                        onChange={(e) => setPrioritizeBalance(e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800">
                          Balance Daily Teacher Distribution
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Evenly spread classes over weekdays instead of clustering
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preflight Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRunPreflight}
                isLoading={validatingPreflight}
                className="gap-2"
              >
                <CalendarCheck className="w-4 h-4 text-brand-600" />
                Run Preflight Check
              </Button>

              <Button
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={selectedClassIds.length === 0}
                className="bg-brand-600 hover:bg-brand-700 text-white gap-2 flex-1 shadow-md shadow-brand-500/20"
              >
                <Sparkles className="w-4 h-4" />
                Solve & Generate Timetable
              </Button>
            </div>
          </div>

          {/* Right Column: Preflight Diagnostics & Results Spotlight */}
          <div className="lg:col-span-5 space-y-5">
            {/* Preflight Diagnostics Display */}
            {preflightData && (
              <Card className="border-brand-200">
                <CardHeader className="bg-slate-50/70">
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {preflightData.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                      Preflight Diagnostics
                    </CardTitle>
                    <Badge variant={preflightData.isValid ? 'success' : 'danger'} size="sm" dot>
                      {preflightData.isValid ? 'Ready to Generate' : 'Conflicts Found'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Slots Utilization Gauge */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-slate-600">Total Period Capacity:</span>
                      <span className="text-slate-900">
                        {preflightData.totalRequiredPeriods} / {preflightData.totalAvailablePeriods} slots
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          preflightData.totalRequiredPeriods > preflightData.totalAvailablePeriods
                            ? 'bg-rose-500'
                            : 'bg-brand-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (preflightData.totalRequiredPeriods /
                                Math.max(1, preflightData.totalAvailablePeriods)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Issues List */}
                  {preflightData.issues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Diagnostics ({preflightData.issues.length})
                      </p>
                      {preflightData.issues.map((iss, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg text-xs border flex items-start gap-2.5 ${
                            iss.severity === 'ERROR'
                              ? 'bg-rose-50 border-rose-200 text-rose-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          {iss.severity === 'ERROR' ? (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <span>{iss.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {preflightData.issues.length === 0 && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>All hard and soft constraints validated successfully! Ready to solve.</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Generation Success Panel */}
            {generationResult && (
              <Card className="border-emerald-300 bg-gradient-to-b from-white to-emerald-50/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-emerald-900">Generated Conflict-Free!</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The solver completed in optimal iterations. Zero teacher double-bookings or classroom collisions exist.
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Total Lessons</span>
                      <p className="text-xl font-black text-slate-900 mt-0.5">
                        {generationResult._count?.entries || generationResult.entries?.length || 0}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Solver Status</span>
                      <p className="text-sm font-bold text-emerald-600 mt-1">100% Solved</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(`/timetables/${generationResult.id}`)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2"
                  >
                    View Timetable Grid <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Engine Rules Reference Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wider text-slate-500">
                  Engine Guarantees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><strong>Hard Constraint:</strong> Teachers cannot be assigned to two classes during the same period.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><strong>Hard Constraint:</strong> A class cannot be double-booked with multiple subjects in one period.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><strong>Hard Constraint:</strong> Honor teacher time-off and unavailable slots from availability grid.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <span><strong>Soft Constraint:</strong> Daily subject distribution avoids clustering heavy subjects on a single day.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
