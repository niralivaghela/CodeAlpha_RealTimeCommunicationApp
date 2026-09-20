import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MessageSquare,
  Video,
  Trash2,
  Mail,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { contactAPI, meetingAPI } from '../services/api';
import { getInitials, getAvatarGradient } from '../utils/avatar';

const ContactsPanel = ({ onStartChat, onStartMeetingWithUser }) => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await contactAPI.getContacts();
      if (res.data?.contacts) {
        setContacts(res.data.contacts);
      }
    } catch (err) {
      console.warn('Failed to load contacts:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactEmail.trim()) return;

    setAddError(null);
    setAddSuccess(null);

    try {
      const res = await contactAPI.addContact({ email: newContactEmail.trim() });
      setAddSuccess('Contact added successfully!');
      setNewContactEmail('');
      fetchContacts();
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess(null);
      }, 1200);
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add contact.');
    }
  };

  const handleRemoveContact = async (id) => {
    try {
      await contactAPI.removeContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.warn('Failed to remove contact:', err.message);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col rounded-2xl glass-panel border border-white/10 dark:border-white/10 light:border-slate-300 p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-white/10 dark:border-white/10 light:border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Contacts Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your address book and start direct calls or chats
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-slate-900/60 dark:bg-slate-900/60 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center space-x-1.5 flex-shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Contacts List Grid */}
      <div className="flex-1 overflow-y-auto pt-6">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
            Loading contacts...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Users className="w-12 h-12 opacity-20 mb-3" />
            <p className="font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
              No contacts found
            </p>
            <p className="text-slate-500 text-[11px] mt-1 max-w-sm text-center">
              Add colleagues by email to see their real-time presence and collaborate with 1 click.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((c) => {
              const initials = getInitials(c.name);
              const gradient = getAvatarGradient(c.name);

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-white/5 dark:border-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 hover:border-indigo-500/30 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradient} text-white font-bold text-sm flex items-center justify-center shadow-md`}
                      >
                        {initials}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                          c.presence === 'available'
                            ? 'bg-emerald-500'
                            : c.presence === 'away'
                            ? 'bg-amber-500'
                            : c.presence === 'busy'
                            ? 'bg-rose-500'
                            : 'bg-slate-500'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate">
                          {c.name}
                        </h4>
                        <button
                          onClick={() => handleRemoveContact(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                          title="Remove Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                      <div className="mt-1 flex items-center space-x-1">
                        <span className="text-[10px] font-semibold capitalize text-emerald-400">
                          {c.presence || 'Available'}
                        </span>
                        {c.statusMessage && (
                          <span className="text-[10px] text-slate-500 truncate">
                            • "{c.statusMessage}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-white/5 dark:border-white/5 light:border-slate-200 flex items-center space-x-2">
                    <button
                      onClick={() => onStartChat && onStartChat(c)}
                      className="flex-1 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-[11px] font-semibold transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => onStartMeetingWithUser && onStartMeetingWithUser(c)}
                      className="flex-1 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/20 text-[11px] font-semibold transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Meet</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl glass-panel border border-white/10 dark:border-white/10 light:border-slate-300 dark:bg-slate-900/95 light:bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900 mb-1">
              Add New Contact
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter their registered Nexora Connect email address
            </p>

            {addError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {addError}
              </div>
            )}
            {addSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{addSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="w-full bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-xl px-3.5 py-2 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPanel;
