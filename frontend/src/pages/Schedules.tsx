import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ScheduleConfigItem, PeriodItem, BreakItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { Clock, Plus, Edit2, Trash2, CheckCircle2, Coffee, Sparkles } from 'lucide-react';

export const Schedules: React.FC = () => {
  const toast = useToast();
  const [schedules, setSchedules] = useState<ScheduleConfigItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ScheduleConfigItem | null>(null);
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState<'NORMAL' | 'PROVISIONAL'>('NORMAL');
  const [isDefault, setIsDefault] = useState(true);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Dynamic periods & breaks in modal
  const [periods, setPeriods] = useState<
    { name: string; order: number; startTime: string; endTime: string; type: string }[]
  >([]);
  const [breaks, setBreaks] = useState<
    { name: string; afterPeriod: number; startTime: string; endTime: string; durationMinutes: number }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/schedules');
      if (res.success) setSchedules(res.configs);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load schedule configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const openCreateModal = () => {
    setEditingConfig(null);
    setName('Standard Weekly Routine');
    setScheduleType('NORMAL');
    setIsDefault(false);
    setWorkingDays([1, 2, 3, 4, 5]);
    setPeriods([
      { name: 'Period 1', order: 1, startTime: '08:30 AM', endTime: '09:15 AM', type: 'TEACHING' },
      { name: 'Period 2', order: 2, startTime: '09:15 AM', endTime: '10:00 AM', type: 'TEACHING' },
      { name: 'Period 3', order: 3, startTime: '10:15 AM', endTime: '11:00 AM', type: 'TEACHING' },
      { name: 'Period 4', order: 4, startTime: '11:00 AM', endTime: '11:45 AM', type: 'TEACHING' },
      { name: 'Period 5', order: 5, startTime: '12:30 PM', endTime: '01:15 PM', type: 'TEACHING' },
      { name: 'Period 6', order: 6, startTime: '01:15 PM', endTime: '02:00 PM', type: 'TEACHING' },
      { name: 'Period 7', order: 7, startTime: '02:00 PM', endTime: '02:45 PM', type: 'TEACHING' },
    ]);
    setBreaks([
      { name: 'Morning Break', afterPeriod: 2, startTime: '10:00 AM', endTime: '10:15 AM', durationMinutes: 15 },
      { name: 'Lunch Break', afterPeriod: 4, startTime: '11:45 AM', endTime: '12:30 PM', durationMinutes: 45 },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (cfg: ScheduleConfigItem) => {
    setEditingConfig(cfg);
    setName(cfg.name);
    setScheduleType(cfg.scheduleType);
    setIsDefault(cfg.isDefault);
    try {
      setWorkingDays(JSON.parse(cfg.workingDays || '[1,2,3,4,5]'));
    } catch (e) {
      setWorkingDays([1, 2, 3, 4, 5]);
    }
    setPeriods(
      cfg.periods.map((p) => ({
        name: p.name,
        order: p.order,
        startTime: p.startTime,
        endTime: p.endTime,
        type: p.type,
      }))
    );
    setBreaks(
      cfg.breaks.map((b) => ({
        name: b.name,
        afterPeriod: b.afterPeriod,
        startTime: b.startTime,
        endTime: b.endTime,
        durationMinutes: b.durationMinutes,
      }))
    );
    setModalOpen(true);
  };

  const addPeriodRow = () => {
    const nextOrder = periods.length + 1;
    setPeriods([
      ...periods,
      {
        name: `Period ${nextOrder}`,
        order: nextOrder,
        startTime: '02:00 PM',
        endTime: '02:45 PM',
        type: 'TEACHING',
      },
    ]);
  };

  const removePeriodRow = (idx: number) => {
    setPeriods(periods.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i + 1 })));
  };

  const addBreakRow = () => {
    setBreaks([
      ...breaks,
      {
        name: 'Short Break',
        afterPeriod: Math.min(2, periods.length),
        startTime: '10:00 AM',
        endTime: '10:15 AM',
        durationMinutes: 15,
      },
    ]);
  };

  const removeBreakRow = (idx: number) => {
    setBreaks(breaks.filter((_, i) => i !== idx));
  };

  const toggleDay = (day: number) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter((d) => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day].sort());
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        scheduleType,
        isDefault,
        workingDays,
        periods,
        breaks,
      };

      if (editingConfig) {
        await api.patch(`/schedules/${editingConfig.id}`, payload);
        toast.success(`Schedule config "${name}" updated!`);
      } else {
        await api.post('/schedules', payload);
        toast.success(`Schedule config "${name}" created!`);
      }
      setModalOpen(false);
      fetchSchedules();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save schedule config');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfig = async (cfg: ScheduleConfigItem) => {
    if (!window.confirm(`Delete configuration "${cfg.name}"?`)) return;
    try {
      await api.delete(`/schedules/${cfg.id}`);
      toast.success(`Schedule configuration "${cfg.name}" removed!`);
      fetchSchedules();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete configuration');
    }
  };

  const daysLabel: Record<number, string> = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    7: 'Sun',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Schedule Configurations & Bells
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure daily period slots, start/end bells, working days, and intermission/recess breaks
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          New Schedule Config
        </Button>
      </div>

      {/* Schedule Configs List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {schedules.map((cfg) => {
            let parsedDays: number[] = [];
            try {
              parsedDays = JSON.parse(cfg.workingDays);
            } catch (e) {
              parsedDays = [1, 2, 3, 4, 5];
            }

            return (
              <Card key={cfg.id} hoverEffect className="overflow-hidden">
                <CardHeader className="bg-slate-50/70 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900">{cfg.name}</CardTitle>
                        {cfg.isDefault && (
                          <Badge variant="success" size="sm" dot>Default {cfg.scheduleType}</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {cfg.scheduleType} Schedule • {parsedDays.length} Working Days • {cfg.periodsPerDay} Periods/Day
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(cfg)}
                      className="text-xs gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </Button>
                    {!cfg.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteConfig(cfg)}
                        className="text-rose-600 hover:bg-rose-50 p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Working Days Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 mr-2">Working Days:</span>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                      const isActive = parsedDays.includes(d);
                      return (
                        <span
                          key={d}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                            isActive
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 text-slate-400 opacity-60'
                          }`}
                        >
                          {daysLabel[d]}
                        </span>
                      );
                    })}
                  </div>

                  {/* Period & Break Sequence Timeline */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Daily Period & Break Sequence
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                      {cfg.periods.map((p) => {
                        const breakAfter = cfg.breaks.find((b) => b.afterPeriod === p.order);

                        return (
                          <React.Fragment key={p.id}>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-center">
                              <span className="text-xs font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {p.startTime} - {p.endTime}
                              </span>
                              <span className="text-[10px] text-brand-600 font-semibold uppercase tracking-wider mt-1 block">
                                {p.type}
                              </span>
                            </div>

                            {breakAfter && (
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-center flex flex-col justify-center items-center">
                                <Coffee className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                                <span className="text-[11px] font-bold text-amber-900">{breakAfter.name}</span>
                                <span className="text-[10px] text-amber-700">
                                  {breakAfter.startTime} ({breakAfter.durationMinutes}m)
                                </span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Schedule Config Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingConfig ? 'Edit Schedule Configuration' : 'Create Schedule Configuration'}
        description="Configure period timings, breaks, and working days"
        maxWidth="3xl"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} isLoading={submitting}>
              {editingConfig ? 'Save Changes' : 'Create Configuration'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Configuration Title"
              required
              placeholder="e.g. Standard 7-Period Week"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Select
              label="Schedule Type"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as any)}
              options={[
                { value: 'NORMAL', label: 'NORMAL (Regular School Routine)' },
                { value: 'PROVISIONAL', label: 'PROVISIONAL (Remedial / Weekend Schedule)' },
              ]}
            />
          </div>

          {/* Working Days Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Working Days per Week
            </label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const active = workingDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {daysLabel[d]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded border-slate-300"
            />
            <label htmlFor="isDefault" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Set as Default schedule configuration for {scheduleType} classes
            </label>
          </div>

          {/* Periods Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Periods ({periods.length})
              </h4>
              <Button size="sm" variant="outline" onClick={addPeriodRow} className="text-xs py-1 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Period
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {periods.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="w-6 text-xs font-bold text-slate-500 text-center">#{p.order}</span>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => {
                      const updated = [...periods];
                      updated[idx].name = e.target.value;
                      setPeriods(updated);
                    }}
                    placeholder="Period Name"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <input
                    type="text"
                    value={p.startTime}
                    onChange={(e) => {
                      const updated = [...periods];
                      updated[idx].startTime = e.target.value;
                      setPeriods(updated);
                    }}
                    placeholder="Start e.g. 09:00 AM"
                    className="w-24 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <span className="text-slate-400 text-xs">-</span>
                  <input
                    type="text"
                    value={p.endTime}
                    onChange={(e) => {
                      const updated = [...periods];
                      updated[idx].endTime = e.target.value;
                      setPeriods(updated);
                    }}
                    placeholder="End e.g. 09:45 AM"
                    className="w-24 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <select
                    value={p.type}
                    onChange={(e) => {
                      const updated = [...periods];
                      updated[idx].type = e.target.value;
                      setPeriods(updated);
                    }}
                    className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                  >
                    <option value="TEACHING">Teaching</option>
                    <option value="ASSEMBLY">Assembly</option>
                    <option value="ACTIVITY">Activity</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removePeriodRow(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Breaks Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Breaks & Recess ({breaks.length})
              </h4>
              <Button size="sm" variant="outline" onClick={addBreakRow} className="text-xs py-1 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Break
              </Button>
            </div>
            <div className="space-y-2">
              {breaks.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                  <input
                    type="text"
                    value={b.name}
                    onChange={(e) => {
                      const updated = [...breaks];
                      updated[idx].name = e.target.value;
                      setBreaks(updated);
                    }}
                    placeholder="e.g. Lunch Break"
                    className="flex-1 px-2.5 py-1 text-xs border border-amber-300 rounded bg-white"
                  />
                  <div className="flex items-center gap-1 text-xs text-amber-900">
                    <span>After Period:</span>
                    <select
                      value={b.afterPeriod}
                      onChange={(e) => {
                        const updated = [...breaks];
                        updated[idx].afterPeriod = parseInt(e.target.value, 10);
                        setBreaks(updated);
                      }}
                      className="px-2 py-1 text-xs border border-amber-300 rounded bg-white"
                    >
                      {periods.map((p) => (
                        <option key={p.order} value={p.order}>
                          Period {p.order}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={b.startTime}
                    onChange={(e) => {
                      const updated = [...breaks];
                      updated[idx].startTime = e.target.value;
                      setBreaks(updated);
                    }}
                    placeholder="Start"
                    className="w-20 px-2 py-1 text-xs border border-amber-300 rounded bg-white"
                  />
                  <input
                    type="text"
                    value={b.endTime}
                    onChange={(e) => {
                      const updated = [...breaks];
                      updated[idx].endTime = e.target.value;
                      setBreaks(updated);
                    }}
                    placeholder="End"
                    className="w-20 px-2 py-1 text-xs border border-amber-300 rounded bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeBreakRow(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
