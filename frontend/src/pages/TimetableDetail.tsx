import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { TimetableItem, TimetableEntryItem, ClassItem, TeacherItem, SubjectItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { Alert } from '../components/ui/Alert';
import { useToast } from '../components/ui/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CalendarDays,
  Printer,
  Download,
  Share2,
  Edit3,
  ArrowLeftRight,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  User,
  GraduationCap,
  Layers,
  ArrowLeft,
  Coffee
} from 'lucide-react';

export const TimetableDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [timetable, setTimetable] = useState<TimetableItem | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'CLASS' | 'TEACHER' | 'MASTER'
  const [viewMode, setViewMode] = useState<'CLASS' | 'TEACHER' | 'MASTER'>('CLASS');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Edit / Swap Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntryItem | null>(null);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [targetSwapEntryId, setTargetSwapEntryId] = useState('');
  const [submittingModal, setSubmittingModal] = useState(false);

  const fetchTimetableDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [ttRes, tchRes, subRes] = await Promise.all([
        api.get(`/timetables/${id}`),
        api.get('/teachers'),
        api.get('/subjects'),
      ]);

      if (ttRes.success && ttRes.timetable) {
        setTimetable(ttRes.timetable);
        // Default to first class
        if (ttRes.timetable.entries && ttRes.timetable.entries.length > 0) {
          const firstClassId = ttRes.timetable.entries[0].classId;
          const firstTeacherId = ttRes.timetable.entries[0].teacherId;
          if (!selectedClassId) setSelectedClassId(firstClassId);
          if (!selectedTeacherId) setSelectedTeacherId(firstTeacherId);
        }
      }
      if (tchRes.success) setTeachers(tchRes.teachers);
      if (subRes.success) setSubjects(subRes.subjects);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load timetable details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableDetails();
  }, [id]);

  // Unique classes in this timetable
  const timetableClasses = useMemo(() => {
    if (!timetable?.entries) return [];
    const map = new Map<string, ClassItem>();
    for (const e of timetable.entries) {
      if (e.class && !map.has(e.classId)) {
        map.set(e.classId, e.class);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [timetable]);

  // Unique teachers with entries in this timetable
  const timetableTeachers = useMemo(() => {
    if (!timetable?.entries) return [];
    const map = new Map<string, TeacherItem>();
    for (const e of timetable.entries) {
      if (e.teacher && !map.has(e.teacherId)) {
        map.set(e.teacherId, e.teacher);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [timetable]);

  // Days list from schedule config
  const workingDays: number[] = useMemo(() => {
    if (!timetable?.scheduleConfig?.workingDays) return [1, 2, 3, 4, 5];
    try {
      return JSON.parse(timetable.scheduleConfig.workingDays);
    } catch (e) {
      return [1, 2, 3, 4, 5];
    }
  }, [timetable]);

  // Periods list from schedule config
  const periods = useMemo(() => {
    if (!timetable?.scheduleConfig?.periods) return [];
    return [...timetable.scheduleConfig.periods].sort((a, b) => a.order - b.order);
  }, [timetable]);

  // Breaks list from schedule config
  const breaks = useMemo(() => {
    if (!timetable?.scheduleConfig?.breaks) return [];
    return [...timetable.scheduleConfig.breaks].sort((a, b) => a.afterPeriod - b.afterPeriod);
  }, [timetable]);

  const daysLabel: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  };

  // Status toggle (DRAFT <-> PUBLISHED)
  const toggleStatus = async () => {
    if (!timetable) return;
    const newStatus = timetable.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await api.patch(`/timetables/${timetable.id}`, { status: newStatus });
      setTimetable({ ...timetable, status: newStatus });
      toast.success(`Timetable marked as ${newStatus}!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update timetable status');
    }
  };

  // Open Edit Slot modal
  const handleCellClick = (entry: TimetableEntryItem) => {
    setSelectedEntry(entry);
    setEditSubjectId(entry.subjectId);
    setEditTeacherId(entry.teacherId);
    setEditNotes(entry.notes || '');
    setEditModalOpen(true);
  };

  const handleSaveSlotEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetable || !selectedEntry) return;

    setSubmittingModal(true);
    try {
      await api.patch(`/timetables/${timetable.id}/entries/${selectedEntry.id}`, {
        subjectId: editSubjectId,
        teacherId: editTeacherId,
        notes: editNotes || null,
        isManualOverride: true,
      });

      toast.success('Timetable lesson updated!');
      setEditModalOpen(false);
      fetchTimetableDetails();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update slot');
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleSwapEntries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetable || !selectedEntry || !targetSwapEntryId) return;

    setSubmittingModal(true);
    try {
      await api.post(`/timetables/${timetable.id}/swap`, {
        entryId1: selectedEntry.id,
        entryId2: targetSwapEntryId,
        allowOverride: true,
      });

      toast.success('Lessons swapped successfully!');
      setSwapModalOpen(false);
      setEditModalOpen(false);
      fetchTimetableDetails();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to swap lessons');
    } finally {
      setSubmittingModal(false);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    if (!timetable) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const schoolTitle = 'SMART SCHOOL ROUTINE';
    const subTitle = `${timetable.title} (${timetable.academicYear}) - ${timetable.timetableType} SCHEDULE`;

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(schoolTitle, 40, 40);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(subTitle, 40, 58);

    // Headers
    const headers = ['Day', ...periods.map((p) => `${p.name}\n${p.startTime}-${p.endTime}`)];

    // Target rows: either selected class or current teacher
    let rows: any[] = [];

    if (viewMode === 'TEACHER') {
      const currentTeacher = timetableTeachers.find((t) => t.id === selectedTeacherId);
      doc.text(`Faculty Schedule: ${currentTeacher?.name || 'All'}`, 40, 75);

      rows = workingDays.map((day) => {
        const row = [daysLabel[day] || `Day ${day}`];
        for (const p of periods) {
          const entry = timetable.entries?.find(
            (e) => e.teacherId === selectedTeacherId && e.dayOfWeek === day && e.periodOrder === p.order
          );
          if (entry) {
            row.push(`${entry.subject.name}\n(${entry.class.name} ${entry.class.section})`);
          } else {
            row.push('-');
          }
        }
        return row;
      });
    } else {
      const currentClass = timetableClasses.find((c) => c.id === selectedClassId);
      doc.text(`Class Schedule: ${currentClass?.name || ''} ${currentClass?.section || ''}`, 40, 75);

      rows = workingDays.map((day) => {
        const row = [daysLabel[day] || `Day ${day}`];
        for (const p of periods) {
          const entry = timetable.entries?.find(
            (e) => e.classId === selectedClassId && e.dayOfWeek === day && e.periodOrder === p.order
          );
          if (entry) {
            row.push(`${entry.subject.name}\n[${entry.teacher.name}]`);
          } else {
            row.push('-');
          }
        }
        return row;
      });
    }

    autoTable(doc, {
      startY: 85,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'center',
        valign: 'middle',
      },
      styles: {
        cellPadding: 6,
      },
    });

    const filename = `${timetable.title.replace(/\s+/g, '_')}_routine.pdf`;
    doc.save(filename);
    toast.success(`Exported ${filename}`);
  };

  // CSV Export Link
  const handleDownloadCSV = () => {
    if (!timetable) return;
    let url = `/api/export/${timetable.id}/csv`;
    if (viewMode === 'CLASS' && selectedClassId) {
      url += `?classId=${selectedClassId}`;
    } else if (viewMode === 'TEACHER' && selectedTeacherId) {
      url += `?teacherId=${selectedTeacherId}`;
    }
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!timetable) {
    return (
      <Card className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Timetable not found</h3>
        <Link to="/timetables" className="mt-4 inline-block">
          <Button size="sm">Back to Timetables</Button>
        </Link>
      </Card>
    );
  }

  const selectedClass = timetableClasses.find((c) => c.id === selectedClassId);
  const selectedTeacher = timetableTeachers.find((t) => t.id === selectedTeacherId);

  return (
    <div className="space-y-6">
      {/* Top Bar / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link to="/timetables">
            <Button variant="outline" size="sm" className="p-2" title="Back to Timetables">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{timetable.title}</h1>
              <Badge variant={timetable.timetableType === 'NORMAL' ? 'primary' : 'warning'} size="sm">
                {timetable.timetableType}
              </Badge>
              <Badge
                variant={timetable.status === 'PUBLISHED' ? 'success' : 'secondary'}
                size="sm"
                dot={timetable.status === 'PUBLISHED'}
              >
                {timetable.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Academic Year {timetable.academicYear} • {timetable.entries?.length || 0} Scheduled Lessons •{' '}
              {timetable.hasConflicts ? 'Contains Warnings' : '100% Conflict-Free'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={timetable.status === 'PUBLISHED' ? 'secondary' : 'success'}
            size="sm"
            onClick={toggleStatus}
            className="text-xs"
          >
            {timetable.status === 'PUBLISHED' ? 'Revert to Draft' : 'Publish Routine'}
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>

          <Button variant="secondary" size="sm" onClick={handlePrint} className="text-xs gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Conflict Banner if any */}
      {timetable.hasConflicts && (
        <Alert variant="danger" title="Schedule Conflicts Detected" className="no-print">
          Some teachers or classes share overlapping lessons or unavailable times. Inspect the highlighted cells below to resolve.
        </Alert>
      )}

      {/* View Selectors & Filter Toolbar */}
      <Card className="no-print">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* View Mode Tabs */}
          <Tabs
            tabs={[
              { id: 'CLASS', label: 'Class View', icon: <GraduationCap className="w-4 h-4" /> },
              { id: 'TEACHER', label: 'Teacher View', icon: <User className="w-4 h-4" /> },
              { id: 'MASTER', label: 'Master View', icon: <Layers className="w-4 h-4" /> },
            ]}
            activeTab={viewMode}
            onChange={(id) => setViewMode(id as any)}
            className="border-b-0"
          />

          {/* Context Dropdown */}
          <div className="flex items-center gap-3">
            {viewMode === 'CLASS' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {timetableClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.section} {c.roomNumber ? `(${c.roomNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === 'TEACHER' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Teacher:</span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {timetableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.employeeId ? `(${t.employeeId})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs text-slate-400 hidden lg:block">
              Click any cell to edit teacher, change subject, or swap slots
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PRINT-ONLY HEADER */}
      <div className="print-only mb-4">
        <h1 className="text-xl font-bold uppercase">{timetable.title}</h1>
        <p className="text-xs">
          Academic Year {timetable.academicYear} • St. Paul Academic High School
        </p>
        <p className="text-xs font-semibold mt-1">
          {viewMode === 'CLASS'
            ? `Class: ${selectedClass?.name || ''} - ${selectedClass?.section || ''} (${selectedClass?.roomNumber || 'Room N/A'})`
            : `Teacher: ${selectedTeacher?.name || ''}`}
        </p>
      </div>

      {/* Timetable Weekly Matrix Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm print-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Header: Days & Period Time Columns */}
            <thead className="bg-slate-900 text-white text-xs border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-28 font-bold uppercase tracking-wider text-slate-300 border-r border-slate-800">
                  Day
                </th>
                {periods.map((p) => {
                  const breakAfter = breaks.find((b) => b.afterPeriod === p.order);

                  return (
                    <React.Fragment key={p.id}>
                      <th className="py-3 px-3 text-center min-w-[140px] border-r border-slate-800">
                        <span className="font-bold text-white block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {p.startTime} - {p.endTime}
                        </span>
                      </th>
                      {breakAfter && (
                        <th className="py-3 px-1.5 text-center min-w-[50px] bg-amber-950/40 text-amber-300 border-r border-slate-800">
                          <span className="text-[10px] uppercase font-bold tracking-wider writing-mode-vertical">
                            {breakAfter.name}
                          </span>
                        </th>
                      )}
                    </React.Fragment>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Body: Rows = Days */}
            <tbody className="divide-y divide-slate-200 text-xs">
              {workingDays.map((day) => (
                <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                  {/* Day Label Column */}
                  <td className="py-3 px-4 font-bold text-slate-800 bg-slate-50/80 border-r border-slate-200">
                    <span className="block">{daysLabel[day]}</span>
                  </td>

                  {/* Period Slot Cells */}
                  {periods.map((p) => {
                    const breakAfter = breaks.find((b) => b.afterPeriod === p.order);

                    // Find corresponding entry based on current viewMode
                    let entry: TimetableEntryItem | undefined;

                    if (viewMode === 'CLASS') {
                      entry = timetable.entries?.find(
                        (e) =>
                          e.classId === selectedClassId &&
                          e.dayOfWeek === day &&
                          e.periodOrder === p.order
                      );
                    } else if (viewMode === 'TEACHER') {
                      entry = timetable.entries?.find(
                        (e) =>
                          e.teacherId === selectedTeacherId &&
                          e.dayOfWeek === day &&
                          e.periodOrder === p.order
                      );
                    }

                    return (
                      <React.Fragment key={p.id}>
                        <td className="p-1.5 border-r border-slate-200 align-top">
                          {entry ? (
                            <div
                              onClick={() => handleCellClick(entry!)}
                              className="w-full h-full min-h-[72px] p-2.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between shadow-2xs hover:shadow-md hover:scale-[1.02]"
                              style={{
                                backgroundColor: `${entry.subject?.color || '#3b82f6'}12`,
                                borderColor: `${entry.subject?.color || '#3b82f6'}40`,
                              }}
                            >
                              {/* Subject Badge & Edit Icon on hover */}
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  className="text-xs font-bold leading-tight"
                                  style={{ color: entry.subject?.color || '#1e3a8a' }}
                                >
                                  {entry.subject?.name}
                                </span>
                                <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 no-print" />
                              </div>

                              {/* Secondary info (Teacher or Class) */}
                              <div className="mt-1.5 text-[11px] text-slate-600 font-medium">
                                {viewMode === 'CLASS' ? (
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{entry.teacher?.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate font-semibold">
                                      {entry.class?.name} - {entry.class?.section}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Room & Override indicator */}
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                <span>{entry.class?.roomNumber || 'Room N/A'}</span>
                                {entry.isManualOverride && (
                                  <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                                    Manual
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full min-h-[72px] rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs">
                              Free
                            </div>
                          )}
                        </td>

                        {/* Break Column */}
                        {breakAfter && (
                          <td className="p-1 text-center bg-amber-50/50 border-r border-slate-200 text-amber-800 text-[10px] font-semibold">
                            <Coffee className="w-3.5 h-3.5 text-amber-600 mx-auto opacity-70 mb-0.5" />
                            {breakAfter.name}
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Slot Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Timetable Lesson Slot"
        description={
          selectedEntry
            ? `${daysLabel[selectedEntry.dayOfWeek]} • Period ${selectedEntry.periodOrder} • Class ${selectedEntry.class?.name} ${selectedEntry.class?.section}`
            : ''
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditModalOpen(false);
                setSwapModalOpen(true);
              }}
              className="gap-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-brand-600" />
              Swap with Another Lesson
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveSlotEdit} isLoading={submittingModal}>
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveSlotEdit} className="space-y-4">
          <Select
            label="Subject"
            required
            value={editSubjectId}
            onChange={(e) => setEditSubjectId(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code || 'NO-CODE'})
              </option>
            ))}
          </Select>

          <Select
            label="Assigned Teacher"
            required
            value={editTeacherId}
            onChange={(e) => setEditTeacherId(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.employeeId ? `(${t.employeeId})` : ''}
              </option>
            ))}
          </Select>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Slot Notes / Instructions (Optional)
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Bring science lab coats"
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </form>
      </Modal>

      {/* Swap Slots Modal */}
      <Modal
        isOpen={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        title="Swap Two Timetable Slots"
        description="Exchange the selected lesson with another period slot in this timetable."
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setSwapModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSwapEntries} isLoading={submittingModal}>
              Confirm Swap
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-brand-50 rounded-lg text-xs text-brand-900 border border-brand-200">
            <strong>Source Lesson:</strong> {selectedEntry?.subject?.name} with {selectedEntry?.teacher?.name} ({daysLabel[selectedEntry?.dayOfWeek || 1]} Period {selectedEntry?.periodOrder})
          </div>

          <Select
            label="Target Lesson to Swap With"
            value={targetSwapEntryId}
            onChange={(e) => setTargetSwapEntryId(e.target.value)}
          >
            <option value="">Select target slot...</option>
            {timetable.entries
              ?.filter((e) => e.id !== selectedEntry?.id && e.classId === selectedEntry?.classId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {daysLabel[e.dayOfWeek]} Period {e.periodOrder}: {e.subject?.name} ({e.teacher?.name})
                </option>
              ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
};
