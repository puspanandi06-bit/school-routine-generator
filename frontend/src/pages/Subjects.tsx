import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { SubjectItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { BookOpen, Plus, Edit2, Trash2, Search, Check, Layers } from 'lucide-react';

const PRESET_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#dc2626', // Red
  '#0284c7', // Sky
  '#ea580c', // Orange
  '#db2777', // Pink
  '#4f46e5', // Indigo
  '#0d9488', // Teal
];

export const Subjects: React.FC = () => {
  const toast = useToast();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [requiresConsecutive, setRequiresConsecutive] = useState(false);
  const [preferredPeriodsPerDay, setPreferredPeriodsPerDay] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subjects');
      if (res.success) setSubjects(res.subjects);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setRequiresConsecutive(false);
    setPreferredPeriodsPerDay('1');
    setModalOpen(true);
  };

  const openEditModal = (s: SubjectItem) => {
    setEditingSubject(s);
    setName(s.name);
    setCode(s.code || '');
    setColor(s.color || '#2563eb');
    setRequiresConsecutive(s.requiresConsecutive);
    setPreferredPeriodsPerDay(String(s.preferredPeriodsPerDay || 1));
    setModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        code: code || null,
        color,
        requiresConsecutive,
        preferredPeriodsPerDay: parseInt(preferredPeriodsPerDay, 10) || 1,
      };

      if (editingSubject) {
        await api.patch(`/subjects/${editingSubject.id}`, payload);
        toast.success(`Subject ${name} updated!`);
      } else {
        await api.post('/subjects', payload);
        toast.success(`Subject ${name} added!`);
      }
      setModalOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (s: SubjectItem) => {
    if (!window.confirm(`Are you sure you want to delete subject "${s.name}"?`)) {
      return;
    }
    try {
      await api.delete(`/subjects/${s.id}`);
      toast.success(`Subject "${s.name}" removed!`);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete subject');
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Curriculum Subjects</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic courses, visual color badges, and consecutive double-period flags for lab sessions
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add Subject
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search subjects or course codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="text-xs text-slate-500">
            Total Subjects: <span className="font-bold text-slate-800">{filteredSubjects.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No subjects found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No subjects match your search filter.' : 'Define your school courses and subjects to get started.'}
          </p>
          <Button onClick={openCreateModal} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Add Subject
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((s) => {
            const qualifiedTeachersCount = s.teacherAssignments?.length || 0;

            return (
              <Card key={s.id} hoverEffect className="flex flex-col justify-between">
                <div>
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.code || s.name.substring(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">{s.name}</CardTitle>
                        <CardDescription>{s.code ? `Code: ${s.code}` : 'No code set'}</CardDescription>
                      </div>
                    </div>
                    {s.requiresConsecutive ? (
                      <Badge variant="primary" size="sm">
                        Consecutive / Lab
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        Standard
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Daily Limit:</span>
                      <span className="font-semibold text-slate-800">
                        {s.preferredPeriodsPerDay} period(s) / day
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Qualified Instructors ({qualifiedTeachersCount})
                      </p>
                      {s.teacherAssignments && s.teacherAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.teacherAssignments.map((asgn) => (
                            <span
                              key={asgn.id}
                              className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                            >
                              {asgn.teacher?.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-rose-600 font-medium">
                          No teacher qualified to teach this subject
                        </p>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(s)}
                    className="p-1.5"
                    title="Edit Subject"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteSubject(s)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
        description="Configure course name, abbreviation code, visual tint, and scheduling preferences"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <Input
            label="Subject Name"
            required
            placeholder="e.g. Mathematics or Computer Science"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Course Code (Optional)"
            placeholder="e.g. MATH-10 or CS"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          {/* Color Picker Swatches */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Color Badge & Timetable Tint
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xs"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 p-0 rounded-full border border-slate-300 cursor-pointer overflow-hidden"
                title="Custom color"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Input
              label="Preferred Max / Day"
              type="number"
              min="1"
              max="4"
              value={preferredPeriodsPerDay}
              onChange={(e) => setPreferredPeriodsPerDay(e.target.value)}
              helperText="How many periods of this subject can a class take in a day"
            />

            <div className="flex flex-col justify-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiresConsecutive}
                  onChange={(e) => setRequiresConsecutive(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <span className="text-xs font-medium text-slate-800">
                  Consecutive Double Periods (Labs/Practical)
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
