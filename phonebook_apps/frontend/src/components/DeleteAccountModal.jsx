import React, { useState } from 'react';
import { AlertOctagon, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DeleteAccountModal = ({ isOpen, onClose, onError }) => {
  const { user, deleteAccount } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isMatch = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!isMatch) return;

    setLoading(true);
    try {
      await deleteAccount();
      onClose();
    } catch (err) {
      console.error('Account deletion error:', err);
      if (onError) {
        onError(err.response?.data?.message || 'Failed to delete account. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-rose-100 overflow-hidden transform transition-all animate-slide-up">
        {/* Header */}
        <div className="bg-rose-50/80 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-700">
            <AlertOctagon className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-bold text-base">Danger Zone: Delete Account</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-600 leading-relaxed space-y-2">
            <p>
              You are about to permanently delete your account (
              <strong className="text-slate-900">{user?.email}</strong>).
            </p>
            <p className="text-rose-600 font-medium">
              This action is permanent and irreversible:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Your account profile will be permanently erased.</li>
              <li>All contacts saved in your phonebook will be cascade deleted.</li>
              <li>All associated sessions and data will be immediately cleared.</li>
            </ul>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              To confirm deletion, type <span className="font-mono text-rose-600 font-bold">DELETE</span> below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm tracking-wider focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 uppercase"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!isMatch || loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md shadow-rose-500/20 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Account Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
