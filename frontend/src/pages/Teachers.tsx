import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { TeacherItem, ScheduleConfigItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import {
  Users,
  Plus,
  CalendarCheck,
  Edit2,
  Trash2,
  Search,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const Teachers: React.FC = () => {
  const toast = useToast();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleConfigItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Teacher CRUD Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [maxPerDay, setMaxPerDay] = useState('5');
  const [maxPerWeek, setMaxPerWeek] = useState('25');
  const [submitting, setSubmitting] = useState(false);

  // Availability Matrix Modal
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherItem | null>(null);
  // map of "day-period" -> { isAvailable: boolean, reason?: string }
  const [availMap, setAvailMap] = useState<Record<string, { isAvailable: boolean; reason?: string }>>({});
  const [availSubmitting, setAvailSubmitting] = useState(false);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const [tchRes, schRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/schedules')
      ]);
      if (tchRes.success) setTeachers(tchRes.teachers);
      if (schRes.success) setSchedules(schRes.schedules);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const openCreateModal = () => {
    setEditingTeacher(null);
    setName('');
    setEmployeeId('');
    setEmail('');
    setPhone('');
    setMaxPerDay('5');
    setMaxPerWeek('25');
    setModalOpen(true);
  };

  const openEditModal = (t: TeacherItem) => {
    setEditingTeacher(t);
    setName(t.name);
    setEmployeeId(t.employeeId || '');
    setEmail(t.email || '');
    setPhone(t.phone || '');
    setMaxPerDay(String(t.maxPeriodsPerDay));
    setMaxPerWeek(String(t.maxPeriodsPerWeek));
    setModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        employeeId: employeeId || null,
        email: email || null,
        phone: phone || null,
        maxPeriodsPerDay: parseInt(maxPerDay, 10) || 5,
        maxPeriodsPerWeek: parseInt(maxPerWeek, 10) || 25,
      };

      if (editingTeacher) {
        await api.patch(`/teachers/${editingTeacher.id}`, payload);
        toast.success(`Teacher ${name} updated!`);
      } else {
        await api.post('/teachers', payload);
        toast.success(`Teacher ${name} added!`);
      }
      setModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (t: TeacherItem) => {
    if (!window.confirm(`Are you sure you want to remove teacher ${t.name}?`)) {
      return;
    }
    try {
      await api.delete(`/teachers/${t.id}`);
      toast.success(`Teacher ${t.name} removed!`);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete teacher');
    }
  };

  const openAvailabilityModal = async (t: TeacherItem) => {
    setSelectedTeacher(t);
    try {
      const res = await api.get(`/teachers/${t.id}`);
      const teacherData = res.teacher || t;
      const initialMap: Record<string, { isAvailable: boolean; reason?: string }> = {};

      if (teacherData.availabilities) {
        for (const a of teacherData.availabilities) {
          const key = `${a.dayOfWeek}-${a.periodOrder}`;
          initialMap[key] = {
            isAvailable: a.isAvailable,
            reason: a.reason || undefined,
          };
        }
      }
      setAvailMap(initialMap);
      setAvailModalOpen(true);
    } catch (e: any) {
      toast.error('Could not load teacher availability details');
    }
  };

  const toggleSlotAvailability = (day: number, period: number) => {
    const key = `${day}-${period}`;
    const current = availMap[key];
    const isCurrentlyAvailable = current ? current.isAvailable : true;

    setAvailMap((prev) => ({
      ...prev,
      [key]: {
        isAvailable: !isCurrentlyAvailable,
        reason: !isCurrentlyAvailable ? undefined : 'Teacher unavailable / off-slot',
      },
    }));
  };

  const handleSaveAvailability = async () => {
    if (!selectedTeacher) return;
    setAvailSubmitting(true);
    try {
      const slots = Object.entries(availMap).map(([key, val]) => {
        const [dayStr, periodStr] = key.split('-');
        return {
          dayOfWeek: parseInt(dayStr, 10),
          periodOrder: parseInt(periodStr, 10),
          isAvailable: val.isAvailable,
          reason: val.reason || null,
        };
      });

      await api.post(`/teachers/${selectedTeacher.id}/availability`, { slots });
      toast.success(`Availability matrix saved for ${selectedTeacher.name}!`);
      setAvailModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save availability');
    } finally {
      setAvailSubmitting(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.employeeId && t.employeeId.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  });

  const days = [
    { day: 1, name: 'Monday' },
    { day: 2, name: 'Tuesday' },
    { day: 3, name: 'Wednesday' },
    { day: 4, name: 'Thursday' },
    { day: 5, name: 'Friday' },
    { day: 6, name: 'Saturday' },
  ];

  const periodsList = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Faculty & Teachers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage teacher profiles, daily period limits, subject qualifications, and busy slot availability
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add Teacher
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search by name, ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-800">{filteredTeachers.length}</span> active instructors
          </div>
        </CardContent>
      </Card>

      {/* Teachers Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : filteredTeachers.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No teachers found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No teachers match your search filter.' : 'Add your first faculty member to begin scheduling.'}
          </p>
          <Button onClick={openCreateModal} size="sm" className="mt-4 gap-1.5">
            <Plus className="w-4 h-4" /> Add Teacher
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((t) => {
            const unavailableCount = t.availabilities?.length || 0;

            return (
              <Card key={t.id} hoverEffect className="flex flex-col justify-between">
                <div>
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                        {t.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">{t.name}</CardTitle>
                        <CardDescription>{t.employeeId ? `ID: ${t.employeeId}` : 'No ID set'}</CardDescription>
                      </div>
                    </div>
                    {unavailableCount > 0 ? (
                      <Badge variant="warning" size="sm">
                        {unavailableCount} Off-Slots
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm" dot>Available</Badge>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3.5">
                    {/* Contact Info */}
                    <div className="space-y-1 text-xs text-slate-600">
                      {t.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{t.email}</span>
                        </div>
                      )}
                      {t.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{t.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Workload limits badge */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Workload Limits:</span>
                      <span className="font-semibold text-slate-800">
                        Max {t.maxPeriodsPerDay}/day • {t.maxPeriodsPerWeek}/week
                      </span>
                    </div>

                    {/* Assigned Subjects */}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Qualified Subjects ({t.subjectAssignments?.length || 0})
                      </p>
                      {t.subjectAssignments && t.subjectAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {t.subjectAssignments.map((asgn) => (
                            <span
                              key={asgn.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border"
                              style={{
                                backgroundColor: `${asgn.subject?.color || '#3b82f6'}15`,
                                borderColor: `${asgn.subject?.color || '#3b82f6'}30`,
                                color: asgn.subject?.color || '#1e3a8a',
                              }}
                            >
                              {asgn.subject?.name}
                              {asgn.class && (
                                <span className="opacity-75 text-[10px]">({asgn.class.name})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 font-medium">No subjects assigned</p>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAvailabilityModal(t)}
                    className="flex-1 text-xs gap-1.5"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-brand-600" />
                    Availability Grid
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(t)}
                    className="p-1.5"
                    title="Edit Teacher"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTeacher(t)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50"
                    title="Delete Teacher"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        description="Configure teacher profile details and teaching period workload thresholds"
      >
        <form onSubmit={handleSaveTeacher} className="space-y-4">
          <Input
            label="Full Name"
            required
            placeholder="e.g. Dr. Sarah Jenkins"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Employee ID (Optional)"
              placeholder="e.g. EMP-101"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
            <Input
              label="Phone Number (Optional)"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="sarah.jenkins@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Periods / Day"
              type="number"
              min="1"
              max="10"
              required
              value={maxPerDay}
              onChange={(e) => setMaxPerDay(e.target.value)}
            />
            <Input
              label="Max Periods / Week"
              type="number"
              min="1"
              max="40"
              required
              value={maxPerWeek}
              onChange={(e) => setMaxPerWeek(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingTeacher ? 'Save Changes' : 'Create Teacher'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Teacher Availability Matrix Modal */}
      <Modal
        isOpen={availModalOpen}
        onClose={() => setAvailModalOpen(false)}
        title={`Availability Schedule: ${selectedTeacher?.name}`}
        description="Click slots to toggle teacher availability. Green = Available, Red = Busy/Unavailable (the CSP scheduler will avoid this slot)."
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Available
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Busy / Off-Duty
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAvailModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveAvailability} isLoading={availSubmitting}>
                Save Availability
              </Button>
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2.5 px-3 text-left font-semibold text-slate-500">Day</th>
                {periodsList.map((p) => (
                  <th key={p} className="py-2.5 px-2 font-semibold text-slate-700">
                    Period {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {days.map((d) => (
                <tr key={d.day} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 text-left font-bold text-slate-800">{d.name}</td>
                  {periodsList.map((p) => {
                    const key = `${d.day}-${p}`;
                    const slot = availMap[key];
                    const isAvailable = slot ? slot.isAvailable : true;

                    return (
                      <td key={p} className="p-1.5">
                        <button
                          type="button"
                          onClick={() => toggleSlotAvailability(d.day, p)}
                          className={`w-full py-2.5 px-1 rounded-lg font-semibold text-xs transition-all shadow-xs flex flex-col items-center justify-center ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          {isAvailable ? (
                            <span className="text-[11px]">Free</span>
                          ) : (
                            <span className="text-[11px] font-bold">Busy</span>
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
      </Modal>
    </div>
  );
};
