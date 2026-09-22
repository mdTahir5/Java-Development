import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, Trash2, ChevronDown, User } from 'lucide-react';

export const Navbar = ({ onOpenDeleteAccount }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              Contact<span className="text-brand-600">Nest</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium -mt-1">Smart Phonebook Manager</p>
          </div>
        </div>

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-3 p-1.5 pl-2.5 pr-2 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-xs"
            aria-expanded={dropdownOpen}
          >
            <div className="flex flex-col text-right hidden sm:block">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {user?.name || 'My Account'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-sm flex items-center justify-center shadow-xs">
              {getInitials(user?.name)}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 animate-fade-in z-40">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Signed in as</p>
                <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5 transition"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Logout</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenDeleteAccount();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
