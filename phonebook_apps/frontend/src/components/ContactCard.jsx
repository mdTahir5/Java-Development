import React from 'react';
import { Phone, Mail, MapPin, Edit3, Trash2 } from 'lucide-react';

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
];

export const ContactCard = ({ contact, onEdit, onDelete }) => {
  const getGradient = (name = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[index];
  };

  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-brand-300 hover:shadow-lg transition-all duration-200 p-5 flex flex-col justify-between group">
      <div>
        {/* Card Header: Avatar, Name, Quick Action Icons */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGradient(
                contact.name
              )} text-white font-bold text-base flex items-center justify-center shadow-xs flex-shrink-0`}
            >
              {getInitials(contact.name)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-brand-600 transition-colors">
                {contact.name}
              </h3>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(contact)}
              className="p-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition"
              title="Edit Contact"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(contact)}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Delete Contact"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="mt-5 space-y-2.5 text-sm text-slate-600">
          {/* Phone */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-brand-600 flex-shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <a
              href={`tel:${contact.phone}`}
              className="font-medium text-slate-800 hover:text-brand-600 transition hover:underline truncate"
            >
              {contact.phone}
            </a>
          </div>

          {/* Email */}
          {contact.email ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <a
                href={`mailto:${contact.email}`}
                className="text-slate-600 hover:text-brand-600 transition hover:underline truncate"
              >
                {contact.email}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 flex-shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <span className="italic">No email provided</span>
            </div>
          )}

          {/* Address */}
          {contact.address ? (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-slate-600 leading-snug line-clamp-2">
                {contact.address}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="italic">No address provided</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Direct Actions Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-2">
        <a
          href={`tel:${contact.phone}`}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center bg-slate-50 text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition"
        >
          Call Now
        </a>
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
          >
            Send Email
          </a>
        )}
      </div>
    </div>
  );
};
