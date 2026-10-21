import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ClassItem, SubjectItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import {
  GraduationCap,
  Plus,
  Sliders,
  Edit2,
  Trash2,
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Classes: React.FC = () => {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [classType, setClassType] = useState<'NORMAL' | 'PROVISIONAL'>('NORMAL');
  const [roomNumber, setRoomNumber] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Requirements Modal
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [selectedClassForReq, setSelectedClassForReq] = useState<ClassItem | null>(null);
  const [requirementsState, setRequirementsState] = useState<{ [subjectId: string]: number }>({});
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const fetchClassesAndSubjects = async () => {
    try {
      setLoading(true);
      const [classRes, subRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects')
      ]);
      if (classRes.success) setClasses(classRes.classes);
      if (subRes.success) setSubjects(subRes.subjects);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesAndSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingClass(null);
    setClassName('');
    setSection('');
    setClassType(activeTab === 'PROVISIONAL' ? 'PROVISIONAL' : 'NORMAL');
    setRoomNumber('');
    setClassModalOpen(true);
  };

  const openEditModal = (c: ClassItem) => {
    setEditingClass(c);
    setClassName(c.name);
    setSection(c.section);
    setClassType(c.classType);
    setRoomNumber(c.roomNumber || '');
    setClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      if (editingClass) {
        await api.patch(`/classes/${editingClass.id}`, {
          name: className,
          section,
          classType,
          roomNumber: roomNumber || null
        });
        toast.success(`Class ${className} ${section} updated!`);
      } else {
        await api.post('/classes', {
          name: className,
          section,
          classType,
          roomNumber: roomNumber || null
        });
        toast.success(`Class ${className} ${section} created!`);
      }
      setClassModalOpen(false);
      fetchClassesAndSubjects();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save class');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteClass = async (c: ClassItem) => {
    if (!window.confirm(`Are you sure you want to delete class ${c.name} - ${c.section}?`)) {
      return;
    }
    try {
      await api.delete(`/classes/${c.id}`);
      toast.success(`Class ${c.name} - ${c.section} deleted!`);
      fetchClassesAndSubjects();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete class');
    }
  };

  const openRequirementsModal = (c: ClassItem) => {
    setSelectedClassForReq(c);
    const initialReqs: { [subjectId: string]: number } = {};
    if (c.subjectRequirements) {
      for (const r of c.subjectRequirements) {
        initialReqs[r.subjectId] = r.periodsPerWeek;
      }
    }
    setRequirementsState(initialReqs);
    setReqModalOpen(true);
  };

  const handleSaveRequirements = async () => {
    if (!selectedClassForReq) return;
    setReqSubmitting(true);
    try {
      const payload = Object.entries(requirementsState)
        .filter(([_, periods]) => periods > 0)
        .map(([subjectId, periodsPerWeek]) => ({
          subjectId,
          periodsPerWeek: Number(periodsPerWeek)
        }));

      await api.post(`/classes/${selectedClassForReq.id}/requirements`, {
        requirements: payload
      });

      toast.success(`Curriculum requirements updated for ${selectedClassForReq.name}!`);
      setReqModalOpen(false);
      fetchClassesAndSubjects();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save subject requirements');
    } finally {
      setReqSubmitting(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (activeTab === 'NORMAL' && c.classType !== 'NORMAL') return false;
    if (activeTab === 'PROVISIONAL' && c.classType !== 'PROVISIONAL') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        (c.roomNumber && c.roomNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const normalCount = classes.filter((c) => c.classType === 'NORMAL').length;
  const provisionalCount = classes.filter((c) => c.classType === 'PROVISIONAL').length;

  const totalPeriodsInReqModal = Object.values(requirementsState).reduce(
    (acc, cur) => acc + (Number(cur) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Classes & Batches</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure student classes, classroom allocations, and weekly subject period quotas
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add New Class
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'ALL', label: 'All Classes', count: classes.length },
              { id: 'NORMAL', label: 'Normal Classes', count: normalCount },
              { id: 'PROVISIONAL', label: 'Provisional / Remedial', count: provisionalCount },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
          />

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search classes or rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Classes Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No classes found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No classes match your search query.' : 'Get started by creating your first class or remedial batch.'}
          </p>
          <Button onClick={openCreateModal} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Add Class
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((c) => {
            const totalRequiredPeriods =
              c.subjectRequirements?.reduce((sum, r) => sum + r.periodsPerWeek, 0) || 0;

            return (
              <Card key={c.id} hoverEffect className="flex flex-col justify-between">
                <div>
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                        {c.section}
                      </div>
                      <div>
                        <CardTitle>{c.name} - {c.section}</CardTitle>
                        <CardDescription>
                          {c.roomNumber ? `Room: ${c.roomNumber}` : 'No room assigned'}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={c.classType === 'NORMAL' ? 'primary' : 'warning'} size="sm">
                      {c.classType}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-3.5">
                    {/* Period Summary Indicator */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Curriculum Load:</span>
                      <span className="font-bold text-slate-900">
                        {totalRequiredPeriods} periods / week
                      </span>
                    </div>

                    {/* Requirements Tags preview */}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Configured Subjects ({c.subjectRequirements?.length || 0})
                      </p>
                      {c.subjectRequirements && c.subjectRequirements.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {c.subjectRequirements.map((r) => (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border"
                              style={{
                                backgroundColor: `${r.subject?.color || '#3b82f6'}15`,
                                borderColor: `${r.subject?.color || '#3b82f6'}30`,
                                color: r.subject?.color || '#1e3a8a'
                              }}
                            >
                              <span className="font-semibold">{r.subject?.code || r.subject?.name}:</span>
                              <span>{r.periodsPerWeek}p</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          0 subject requirements set
                        </p>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRequirementsModal(c)}
                    className="flex-1 text-xs gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-brand-600" />
                    Requirements
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(c)}
                    className="p-1.5"
                    title="Edit Class"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteClass(c)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50"
                    title="Delete Class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Class Modal */}
      <Modal
        isOpen={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title={editingClass ? 'Edit Class' : 'Add New Class'}
        description="Specify class grade name, section, and standard room allocation"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <Input
            label="Class / Grade Name"
            required
            placeholder="e.g. Class 10 or Grade 9"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />

          <Input
            label="Section"
            required
            placeholder="e.g. A, B, Alpha"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />

          <Select
            label="Class Schedule Type"
            value={classType}
            onChange={(e) => setClassType(e.target.value as any)}
            options={[
              { value: 'NORMAL', label: 'NORMAL (Standard weekly academic curriculum)' },
              { value: 'PROVISIONAL', label: 'PROVISIONAL (Remedial / Intensive batch)' },
            ]}
          />

          <Input
            label="Room Number / Hall (Optional)"
            placeholder="e.g. Room 101 or Lab 2"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={modalSubmitting}>
              {editingClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Configure Subject Requirements Modal */}
      <Modal
        isOpen={reqModalOpen}
        onClose={() => setReqModalOpen(false)}
        title={`Subject Requirements: ${selectedClassForReq?.name} ${selectedClassForReq?.section}`}
        description="Set how many periods per week each subject must be scheduled for this class"
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs">
              <span className="text-slate-500">Total Weekly Load: </span>
              <span className="font-bold text-slate-900 text-sm">{totalPeriodsInReqModal} periods</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setReqModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveRequirements} isLoading={reqSubmitting}>
                Save Requirements
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {subjects.length === 0 ? (
            <p className="text-xs text-slate-500">No subjects created in the school yet.</p>
          ) : (
            subjects.map((subj) => {
              const currentVal = requirementsState[subj.id] || 0;
              return (
                <div
                  key={subj.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: subj.color || '#3b82f6' }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{subj.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {subj.code || 'NO-CODE'} • {subj.requiresConsecutive ? 'Consecutive Preferred' : 'Single periods'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Periods/week:</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={currentVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setRequirementsState((prev) => ({
                          ...prev,
                          [subj.id]: val,
                        }));
                      }}
                      className="w-16 px-2.5 py-1.5 text-center text-sm font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};
