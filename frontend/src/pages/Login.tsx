import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { School, Sparkles, CheckCircle2, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, setupInitialAdmin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Setup fields
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-2026');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await setupInitialAdmin({
        schoolName,
        adminName,
        email,
        password,
        academicYear,
      });
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete initial setup');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@school.edu');
    setPassword('Admin@123456');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center relative overflow-hidden font-sans">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: Branding & Feature Highlights */}
        <div className="lg:col-span-6 text-white space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            CSP Conflict-Free Generator
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Smart School <br />
            <span className="bg-gradient-to-r from-brand-400 to-indigo-300 bg-clip-text text-transparent">
              Routine Generator
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg">
            Automate weekly academic timetables with zero teacher double-bookings, balanced subject distribution, custom break slots, and one-click PDF/CSV exports.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'Strict hard constraints: No teacher in two rooms simultaneously',
              'Soft constraints: Subject spacing & preferred daily limits',
              'Support for Normal & Provisional/Remedial schedules',
              'Interactive Class & Teacher timetable views with instant drag/swap'
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Auth Card */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 backdrop-blur-xl">
            {/* Tab switch */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  mode === 'login' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('setup'); setError(null); }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  mode === 'setup' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                New School Setup
              </button>
            </div>

            {error && (
              <Alert variant="danger" className="mb-5" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="admin@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Button
                  type="submit"
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 mt-2"
                  isLoading={loading}
                >
                  Sign In to Dashboard
                </Button>

                {/* 1-Click Demo Fill */}
                <div className="pt-3 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={fillDemoAdmin}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                    <span>Fill Demo Admin Credentials (admin@school.edu)</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSetup} className="space-y-4">
                <Input
                  label="School / Institution Name"
                  required
                  placeholder="Springfield Academy"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />

                <Input
                  label="Academic Year"
                  required
                  placeholder="2025-2026"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                />

                <Input
                  label="Administrator Name"
                  required
                  placeholder="Principal John Doe"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />

                <Input
                  label="Admin Email"
                  type="email"
                  required
                  placeholder="principal@academy.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Set Admin Password"
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Button
                  type="submit"
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 mt-2"
                  isLoading={loading}
                >
                  Create School & Admin Account
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
