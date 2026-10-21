import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Generator } from './pages/Generator';
import { TimetablesList } from './pages/TimetablesList';
import { TimetableDetail } from './pages/TimetableDetail';
import { Classes } from './pages/Classes';
import { Teachers } from './pages/Teachers';
import { Subjects } from './pages/Subjects';
import { Assignments } from './pages/Assignments';
import { Schedules } from './pages/Schedules';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
          <p className="text-xs font-semibold text-slate-400">Loading Smart Scheduler...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="generator" element={<Generator />} />
              <Route path="timetables" element={<TimetablesList />} />
              <Route path="timetables/:id" element={<TimetableDetail />} />
              <Route path="classes" element={<Classes />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="assignments" element={<Assignments />} />
              <Route path="schedules" element={<Schedules />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
