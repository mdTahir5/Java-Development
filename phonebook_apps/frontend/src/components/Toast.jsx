import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 flex-shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
    error: 'border-rose-200 bg-rose-50/90 text-rose-900',
    info: 'border-indigo-200 bg-indigo-50/90 text-indigo-900',
  };

  return (
    <div className="fixed top-5 right-5 z-50 animate-slide-up max-w-md w-full px-4 sm:px-0">
      <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all ${borders[type] || borders.info}`}>
        {icons[type] || icons.info}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
