import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, Menu, School as SchoolIcon, User } from 'lucide-react';
import { Button } from '../ui/Button';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 transition-all no-print">
      <div className="flex items-center justify-between">
        {/* Left: Mobile menu toggle + School Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <SchoolIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm tracking-tight">
                  {user?.school?.name || 'Smart School Timetable'}
                </span>
                {user?.school?.academicYear && (
                  <span className="text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">
                    {user.school.academicYear}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Automated Constraint Engine</p>
            </div>
          </div>
        </div>

        {/* Right: Quick Generator Button & User Profile */}
        <div className="flex items-center gap-3">
          <Link to="/generator">
            <Button
              size="sm"
              className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white shadow-sm border-0 gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Generate Routine</span>
            </Button>
          </Link>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User profile dropdown / pill */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-semibold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role?.toLowerCase() || 'Admin'}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
