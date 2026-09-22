import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ContactCard } from '../components/ContactCard';
import { ContactModal } from '../components/ContactModal';
import { DeleteModal } from '../components/DeleteModal';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { Toast } from '../components/Toast';
import {
  Search,
  Plus,
  Users,
  Phone,
  Mail,
  X,
  Loader2,
  UserPlus,
  Inbox,
  Sparkles,
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 4000);
  };

  const fetchContacts = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const res = await api.get('/contacts', {
        params: searchQuery ? { search: searchQuery } : {},
      });
      setContacts(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      showToast('Could not load contacts', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, fetchContacts]);

  // Handle Save (Add or Edit)
  const handleSaveContact = async (contactData) => {
    if (editingContact?.id) {
      const res = await api.put(`/contacts/${editingContact.id}`, contactData);
      setContacts((prev) =>
        prev.map((c) => (c.id === editingContact.id ? res.data.data : c))
      );
      showToast(`Contact "${contactData.name}" updated successfully!`, 'success');
    } else {
      const res = await api.post('/contacts', contactData);
      setContacts((prev) => [res.data.data, ...prev]);
      showToast(`Contact "${contactData.name}" added successfully!`, 'success');
    }
    setEditingContact(null);
  };

  // Handle Delete Single Contact
  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    try {
      await api.delete(`/contacts/${contactToDelete.id}`);
      setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
      showToast(`Contact "${contactToDelete.name}" deleted.`, 'info');
    } catch (err) {
      console.error('Failed to delete contact:', err);
      showToast('Failed to delete contact.', 'error');
    } finally {
      setContactToDelete(null);
    }
  };

  // Calculate statistics
  const totalContacts = contacts.length;
  const withEmailCount = contacts.filter((c) => c.email && c.email.trim() !== '').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />

      {/* Navbar with User info & dropdown */}
      <Navbar onOpenDeleteAccount={() => setDeleteAccountOpen(true)} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Stats Hero */}
        <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 rounded-3xl text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/10 mb-8 relative overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-brand-200 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.name || 'Friend'}!
              </h2>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Manage, search, and connect with your personal and business contacts in one organized place.
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 min-w-[110px]">
                <div className="flex items-center gap-2 text-brand-200 text-xs font-medium">
                  <Users className="w-4 h-4" />
                  <span>Total</span>
                </div>
                <p className="text-2xl font-bold mt-0.5">{totalContacts}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 min-w-[110px]">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium">
                  <Mail className="w-4 h-4" />
                  <span>With Email</span>
                </div>
                <p className="text-2xl font-bold mt-0.5">{withEmailCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts by name, email, phone, or address..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 shadow-2xs transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add Contact Trigger Button */}
          <button
            onClick={() => {
              setEditingContact(null);
              setContactModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition duration-150 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>

        {/* Contacts Section */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
            <p className="text-sm font-medium">Loading your contacts...</p>
          </div>
        ) : contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={(c) => {
                  setEditingContact(c);
                  setContactModalOpen(true);
                }}
                onDelete={(c) => {
                  setContactToDelete(c);
                  setDeleteModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : search ? (
          /* No search results */
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No matching contacts</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              No contacts found matching &ldquo;<span className="font-semibold text-slate-700">{search}</span>&rdquo;. Try searching with a different term.
            </p>
            <button
              onClick={() => setSearch('')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition"
            >
              Clear Search
            </button>
          </div>
        ) : (
          /* Empty state: 0 contacts */
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Your phonebook is empty</h3>
            <p className="text-sm text-slate-500 mt-1.5 mb-6 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t added any contacts yet. Keep all your important phone numbers, emails, and addresses neatly organized here.
            </p>
            <button
              onClick={() => {
                setEditingContact(null);
                setContactModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Contact</span>
            </button>
          </div>
        )}
      </main>

      {/* Add / Edit Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
        contact={editingContact}
      />

      {/* Delete Contact Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setContactToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        contactName={contactToDelete?.name || ''}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
        onError={(msg) => showToast(msg, 'error')}
      />
    </div>
  );
};
