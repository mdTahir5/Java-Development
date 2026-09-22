import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 text-brand-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Starting ContactNest...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return authView === 'login' ? (
    <Login onSwitchToRegister={() => setAuthView('register')} />
  ) : (
    <Register onSwitchToLogin={() => setAuthView('login')} />
  );
}
