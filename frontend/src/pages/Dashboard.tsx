import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarDays,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Plus
} from 'lucide-react';

interface DashboardStats {
  totalClasses: number;
  normalClassesCount: number;
  provisionalClassesCount: number;
  totalTeachers: number;
  totalSubjects: number;
  totalTimetables: number;
  lastGenerated: {
    id: string;
    title: string;
    type: string;
    academicYear: string;
    status: string;
    createdAt: string;
    totalLessons: number;
    hasConflicts: boolean;
  } | null;
  recentTimetables: {
    id: string;
    title: string;
    timetableType: string;
    academicYear: string;
    status: string;
    hasConflicts: boolean;
    createdAt: string;
    _count: { entries: number };
  }[];
  warnings: {
    type: 'ERROR' | 'WARNING';
    message: string;
    link?: string;
  }[];
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Action Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-3 border border-brand-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Automated Academic Routine Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            School Schedule & Routine Command Center
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Manage classes, teacher workloads, subject requirements, and generate zero-conflict weekly timetables using our constraint solver.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link to="/generator">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg shadow-brand-500/25 border-0">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate New Routine
              </Button>
            </Link>
            <Link to="/classes">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/15">
                <Plus className="w-4 h-4 mr-1.5" />
                Manage Classes
              </Button>
            </Link>
            <Link to="/teachers">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/15">
                <Users className="w-4 h-4 mr-1.5" />
                Teachers
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Warnings & Diagnostics */}
      {stats?.warnings && stats.warnings.length > 0 && (
        <div className="space-y-2">
          {stats.warnings.map((w, idx) => (
            <Alert
              key={idx}
              variant={w.type === 'ERROR' ? 'danger' : 'warning'}
              className="py-2.5 px-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span>{w.message}</span>
                {w.link && (
                  <Link
                    to={w.link}
                    className="text-xs font-bold underline underline-offset-2 hover:opacity-80"
                  >
                    Configure Now →
                  </Link>
                )}
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Classes Stat */}
        <Card hoverEffect>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Classes</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalClasses || 0}</h3>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                <span>{stats?.normalClassesCount || 0} Normal</span>
                <span>•</span>
                <span>{stats?.provisionalClassesCount || 0} Provisional</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Teachers Stat */}
        <Card hoverEffect>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teachers</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalTeachers || 0}</h3>
              <p className="mt-1.5 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active faculty
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Subjects Stat */}
        <Card hoverEffect>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalSubjects || 0}</h3>
              <p className="mt-1.5 text-[11px] text-slate-500">Curriculum courses</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Timetables Stat */}
        <Card hoverEffect>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Routines</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalTimetables || 0}</h3>
              <p className="mt-1.5 text-[11px] text-brand-600 font-medium">Generated schedules</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Split section: Last Generated Quick View & Recent Routines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Last Generated Timetable Spotlight */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div>
                <CardTitle>Latest Timetable</CardTitle>
                <CardDescription>Most recently generated schedule</CardDescription>
              </div>
              <Badge variant="primary">Active</Badge>
            </CardHeader>
            <CardContent className="flex-1">
              {stats?.lastGenerated ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{stats.lastGenerated.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={stats.lastGenerated.type === 'NORMAL' ? 'primary' : 'warning'} size="sm">
                        {stats.lastGenerated.type}
                      </Badge>
                      <Badge variant={stats.lastGenerated.status === 'PUBLISHED' ? 'success' : 'secondary'} size="sm">
                        {stats.lastGenerated.status}
                      </Badge>
                      {stats.lastGenerated.hasConflicts ? (
                        <Badge variant="danger" size="sm">Conflicts</Badge>
                      ) : (
                        <Badge variant="success" size="sm" dot>Conflict Free</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Scheduled Lessons</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{stats.lastGenerated.totalLessons}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[11px] text-slate-400 font-semibold uppercase">Academic Year</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">{stats.lastGenerated.academicYear}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link to={`/timetables/${stats.lastGenerated.id}`}>
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2">
                        <Eye className="w-4 h-4" />
                        View & Edit Routine
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <CalendarDays className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
                  <p className="text-sm">No timetable generated yet.</p>
                  <Link to="/generator" className="inline-block mt-3">
                    <Button size="sm">Run Generator</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Recent Timetables Table */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div>
                <CardTitle>Recent Timetables</CardTitle>
                <CardDescription>All academic schedules generated</CardDescription>
              </div>
              <Link to="/timetables">
                <Button variant="ghost" size="sm" className="text-brand-600 gap-1">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              {stats?.recentTimetables && stats.recentTimetables.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">Title</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Lessons</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.recentTimetables.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-slate-900">
                            {item.title}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant={item.timetableType === 'NORMAL' ? 'primary' : 'warning'} size="sm">
                              {item.timetableType}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant={item.status === 'PUBLISHED' ? 'success' : 'secondary'}
                              size="sm"
                              dot={item.status === 'PUBLISHED'}
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 font-medium">{item._count?.entries || 0}</td>
                          <td className="px-4 py-3.5 text-right">
                            <Link to={`/timetables/${item.id}`}>
                              <Button size="sm" variant="outline" className="py-1 px-2.5 text-xs">
                                Open
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No timetables available. Click "Generate New Routine" above to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
