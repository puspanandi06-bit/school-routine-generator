import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Sparkles,
  CalendarDays,
  GraduationCap,
  Users,
  BookOpen,
  GitBranch,
  Clock,
  Settings,
  HelpCircle
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      to: '/generator',
      label: 'Routine Generator',
      icon: <Sparkles className="w-4 h-4 text-brand-500" />,
      badge: 'Engine',
    },
    { to: '/timetables', label: 'All Routines', icon: <CalendarDays className="w-4 h-4" /> },
    { to: '/classes', label: 'Classes & Batches', icon: <GraduationCap className="w-4 h-4" /> },
    { to: '/teachers', label: 'Teachers', icon: <Users className="w-4 h-4" /> },
    { to: '/subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" /> },
    { to: '/assignments', label: 'Teacher Allocations', icon: <GitBranch className="w-4 h-4" /> },
    { to: '/schedules', label: 'Periods & Breaks', icon: <Clock className="w-4 h-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden no-print"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={clsx(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto border-r border-slate-800 no-print',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand / Logo header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-inner">
              R
            </div>
            <div>
              <h2 className="text-white font-bold text-sm tracking-tight leading-none">RoutineAI</h2>
              <span className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase">Pro Scheduler</span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Main Menu</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )
              }
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-xs font-semibold text-white">CSP Solver Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Guarantees zero teacher collision & balanced student loads.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
