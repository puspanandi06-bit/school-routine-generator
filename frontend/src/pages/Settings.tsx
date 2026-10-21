import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { School, Settings as SettingsIcon, ShieldCheck, Database, CheckCircle2, User } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        setLoading(true);
        const res = await api.get('/school');
        if (res.success && res.school) {
          setName(res.school.name || '');
          setCode(res.school.code || '');
          setAcademicYear(res.school.academicYear || '2025-2026');
          setPhone(res.school.phone || '');
          setEmail(res.school.email || '');
          setAddress(res.school.address || '');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load school profile');
      } finally {
        setLoading(false);
      }
    };

    fetchSchool();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/school', {
        name,
        code,
        academicYear,
        phone,
        email,
        address,
      });
      await refreshUser();
      toast.success('School profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update school settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System & Institution Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure academic institution profile, current active year, and review solver environment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: School Profile Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <School className="w-5 h-5 text-brand-600" />
                <CardTitle className="text-base font-bold">Institution Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading profile...</div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <Input
                    label="School / Institution Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="School Code (e.g. SPA-2025)"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                    <Input
                      label="Active Academic Year"
                      required
                      placeholder="2025-2026"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Official Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      label="Official Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Campus Address
                    </label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="100 University Avenue, Academic Valley"
                      className="block w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" isLoading={saving} className="bg-brand-600 hover:bg-brand-700 text-white">
                      Save Institution Profile
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: User & Engine Metadata */}
        <div className="space-y-5">
          {/* User Account */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400">
                Active Administrator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700">
                  {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-500">{user?.email}</p>
                </div>
              </div>
              <Badge variant="primary" size="sm">
                Role: {user?.role || 'ADMIN'}
              </Badge>
            </CardContent>
          </Card>

          {/* Engine & Database info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-wider text-slate-400">
                Scheduling Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Scheduler Engine:</span>
                <span className="font-semibold text-slate-800">CSP Backtracking</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Soft Constraints:</span>
                <span className="font-semibold text-slate-800">Heuristic Balancing</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Multi-DB Support:</span>
                <span className="font-semibold text-slate-800">SQLite & Postgres</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Export Capabilities:</span>
                <span className="font-semibold text-slate-800">PDF, CSV, Print</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
