import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { TimetableItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import {
  CalendarDays,
  Sparkles,
  Eye,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers
} from 'lucide-react';

export const TimetablesList: React.FC = () => {
  const toast = useToast();
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchTimetables = async () => {
    try {
      setLoading(true);
      const res = await api.get('/timetables');
      if (res.success) setTimetables(res.timetables);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete timetable "${title}"?`)) return;
    try {
      await api.delete(`/timetables/${id}`);
      toast.success(`Timetable "${title}" deleted`);
      fetchTimetables();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete timetable');
    }
  };

  const handleDownloadCSV = (id: string) => {
    window.open(`/api/export/${id}/csv`, '_blank');
  };

  const filteredTimetables = timetables.filter((t) => {
    if (activeTab === 'NORMAL' && t.timetableType !== 'NORMAL') return false;
    if (activeTab === 'PROVISIONAL' && t.timetableType !== 'PROVISIONAL') return false;
    if (activeTab === 'PUBLISHED' && t.status !== 'PUBLISHED') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Academic Routines</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse, inspect, and export all generated school timetables
          </p>
        </div>
        <Link to="/generator">
          <Button className="bg-brand-600 hover:bg-brand-700 text-white gap-2 shrink-0">
            <Sparkles className="w-4 h-4" />
            Generate New Routine
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs
            tabs={[
              { id: 'ALL', label: 'All Routines', count: timetables.length },
              {
                id: 'NORMAL',
                label: 'Normal Schedules',
                count: timetables.filter((t) => t.timetableType === 'NORMAL').length,
              },
              {
                id: 'PROVISIONAL',
                label: 'Provisional Batches',
                count: timetables.filter((t) => t.timetableType === 'PROVISIONAL').length,
              },
              {
                id: 'PUBLISHED',
                label: 'Published',
                count: timetables.filter((t) => t.status === 'PUBLISHED').length,
              },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
          />
        </CardContent>
      </Card>

      {/* Grid of Timetables */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : filteredTimetables.length === 0 ? (
        <Card className="text-center py-12">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No timetables found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Run the routine generator to create conflict-free class timetables.
          </p>
          <Link to="/generator" className="inline-block mt-4">
            <Button size="sm" className="gap-1.5">
              <Sparkles className="w-4 h-4" /> Generate Timetable
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTimetables.map((item) => (
            <Card key={item.id} hoverEffect className="flex flex-col justify-between">
              <div>
                <CardHeader className="bg-slate-50/50 pb-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">{item.title}</CardTitle>
                    <CardDescription>Academic Year {item.academicYear}</CardDescription>
                  </div>
                  <Badge variant={item.timetableType === 'NORMAL' ? 'primary' : 'warning'} size="sm">
                    {item.timetableType}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Status & Conflict Badges */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.status === 'PUBLISHED' ? 'success' : 'secondary'}
                      size="sm"
                      dot={item.status === 'PUBLISHED'}
                    >
                      {item.status}
                    </Badge>

                    {item.hasConflicts ? (
                      <Badge variant="danger" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Conflicts Found
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm" dot>
                        Conflict-Free
                      </Badge>
                    )}
                  </div>

                  {/* Stat breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Lessons
                      </span>
                      <span className="text-base font-bold text-slate-800">
                        {item._count?.entries || 0} slots
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                        Template
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate block mt-1">
                        {item.scheduleConfig?.name || 'Standard'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Generated: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link to={`/timetables/${item.id}`} className="flex-1">
                  <Button size="sm" className="w-full text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white">
                    <Eye className="w-3.5 h-3.5" /> Open Routine
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadCSV(item.id)}
                  className="p-2"
                  title="Export CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(item.id, item.title)}
                  className="p-2 text-rose-600 hover:bg-rose-50"
                  title="Delete Routine"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
