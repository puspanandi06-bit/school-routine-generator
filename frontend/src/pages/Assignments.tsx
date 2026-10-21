import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TeacherItem, SubjectItem, ClassItem, TeacherAssignment } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { GitBranch, Plus, Trash2, Check, UserCheck, Search } from 'lucide-react';

export const Assignments: React.FC = () => {
  const toast = useToast();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // New allocation modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, sRes, cRes, aRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/subjects'),
        api.get('/classes'),
        api.get('/assignments'),
      ]);
      if (tRes.success) setTeachers(tRes.teachers);
      if (sRes.success) setSubjects(sRes.subjects);
      if (cRes.success) setClasses(cRes.classes);
      if (aRes.success) setAssignments(aRes.assignments);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAssignModal = () => {
    setSelectedTeacherId(teachers[0]?.id || '');
    setSelectedSubjectId(subjects[0]?.id || '');
    setSelectedClassId('');
    setModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedSubjectId) return;

    setSubmitting(true);
    try {
      await api.post('/assignments', {
        teacherId: selectedTeacherId,
        subjectId: selectedSubjectId,
        classId: selectedClassId || null,
      });
      toast.success('Subject allocation saved!');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign teacher to subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (asgnId: string) => {
    try {
      await api.delete(`/assignments/${asgnId}`);
      toast.success('Allocation removed');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete assignment');
    }
  };

  // Quick matrix toggle: handles batch assigning teacher to subject
  const handleToggleMatrix = async (teacher: TeacherItem, subject: SubjectItem) => {
    const existing = assignments.find(
      (a) => a.teacherId === teacher.id && a.subjectId === subject.id && !a.classId
    );

    try {
      if (existing) {
        await api.delete(`/assignments/${existing.id}`);
        toast.info(`Removed ${teacher.name} from ${subject.name}`);
      } else {
        await api.post('/assignments', {
          teacherId: teacher.id,
          subjectId: subject.id,
          classId: null,
        });
        toast.success(`Assigned ${teacher.name} to ${subject.name}`);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update qualification');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Teacher Allocations & Qualifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define which faculty members are qualified to teach each curriculum subject, with optional class restrictions
          </p>
        </div>
        <Button onClick={openAssignModal} className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Assign Teacher to Subject
        </Button>
      </div>

      {/* Interactive Matrix Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-600" />
              Direct Qualification Matrix
            </CardTitle>
            <CardDescription>
              Click any cell to quickly qualify or unqualify a teacher for a subject (school-wide)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center min-h-[250px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[180px]">
                      Teacher
                    </th>
                    {subjects.map((s) => (
                      <th key={s.id} className="px-3 py-3 text-center min-w-[120px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="truncate">{s.code || s.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200">
                        {t.name}
                        {t.employeeId && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {t.employeeId}
                          </span>
                        )}
                      </td>
                      {subjects.map((s) => {
                        const isAssigned = assignments.some(
                          (a) => a.teacherId === t.id && a.subjectId === s.id && !a.classId
                        );

                        return (
                          <td key={s.id} className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleMatrix(t, s)}
                              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all ${
                                isAssigned
                                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-300'
                              }`}
                              title={
                                isAssigned
                                  ? `${t.name} qualifies for ${s.name} (Click to remove)`
                                  : `Click to qualify ${t.name} for ${s.name}`
                              }
                            >
                              {isAssigned ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : (
                                <span className="text-xs font-bold text-slate-400">+</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class-Specific / Granular Allocations List */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>All Active Teacher Allocations ({assignments.length})</CardTitle>
            <CardDescription>
              Detailed list of teacher to subject mapping including any class-specific restrictions
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Teacher</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Scope / Restriction</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((asgn) => (
                  <tr key={asgn.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-semibold text-slate-900">{asgn.teacher?.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: asgn.subject?.color || '#3b82f6' }}
                        />
                        <span className="font-medium text-slate-800">{asgn.subject?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {asgn.class ? (
                        <Badge variant="warning" size="sm">
                          Only: {asgn.class.name} - {asgn.class.section}
                        </Badge>
                      ) : (
                        <Badge variant="primary" size="sm">
                          All Classes
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAssignment(asgn.id)}
                        className="text-rose-600 hover:bg-rose-50 p-1"
                        title="Delete Allocation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Assignment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign Teacher to Subject"
        description="Select an instructor and course. Optionally restrict to a specific student class."
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <Select
            label="Select Teacher"
            required
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.employeeId ? `(${t.employeeId})` : ''}
              </option>
            ))}
          </Select>

          <Select
            label="Select Subject"
            required
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </option>
            ))}
          </Select>

          <Select
            label="Class Scope (Optional)"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">All Classes (School-wide qualification)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Specific: {c.name} - {c.section} ({c.classType})
              </option>
            ))}
          </Select>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Assign Qualification
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
