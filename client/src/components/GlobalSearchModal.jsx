import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  Video,
  FolderOpen,
  MessageSquare,
  X,
  Download,
  LogIn,
  Send,
  Loader2,
} from 'lucide-react';
import { searchAPI, fileAPI } from '../services/api';
import { getInitials, getAvatarGradient } from '../utils/avatar';

const GlobalSearchModal = ({ isOpen, onClose, onSelectUser, onJoinMeeting }) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | people | meetings | files | messages
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState({ people: [], meetings: [], files: [], messages: [] });
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ people: [], meetings: [], files: [], messages: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ people: [], meetings: [], files: [], messages: [] });
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchAPI.globalSearch(query.trim());
        if (res.data) {
          setResults({
            people: res.data.people || [],
            meetings: res.data.meetings || [],
            files: res.data.files || [],
            messages: res.data.messages || [],
          });
        }
      } catch (err) {
        console.warn('Search query failed:', err.message);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    results.people.length +
    results.meetings.length +
    results.files.length +
    results.messages.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl glass-panel border border-white/10 dark:border-white/10 light:border-slate-300 dark:bg-slate-900/95 light:bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 dark:border-white/10 light:border-slate-200">
          <Search className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, meetings, files, messages across Nexora Connect..."
            className="w-full bg-transparent text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-500 focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mr-2" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 px-4 py-2 bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-50 border-b border-white/5 dark:border-white/5 light:border-slate-200 overflow-x-auto text-xs">
          {[
            { id: 'all', label: `All (${totalResults})` },
            { id: 'people', label: `People (${results.people.length})`, icon: Users },
            { id: 'meetings', label: `Meetings (${results.meetings.length})`, icon: Video },
            { id: 'files', label: `Files (${results.files.length})`, icon: FolderOpen },
            { id: 'messages', label: `Messages (${results.messages.length})`, icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Type keywords above to search people, scheduled meetings, uploaded files, and chats.
            </div>
          ) : totalResults === 0 && !isLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No results found for "{query}".
            </div>
          ) : (
            <>
              {/* 1. People */}
              {(activeTab === 'all' || activeTab === 'people') && results.people.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>People ({results.people.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {results.people.map((u) => {
                      const initials = getInitials(u.name);
                      const gradient = getAvatarGradient(u.name);
                      return (
                        <div
                          key={u._id || u.id}
                          className="p-2.5 rounded-xl border border-white/5 dark:border-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 flex items-center justify-between hover:border-indigo-500/30 transition-all"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="relative">
                              <div
                                className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center`}
                              >
                                {initials}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                                  u.presence === 'available'
                                    ? 'bg-emerald-500'
                                    : u.presence === 'away'
                                    ? 'bg-amber-500'
                                    : u.presence === 'busy'
                                    ? 'bg-rose-500'
                                    : 'bg-slate-500'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate block">
                                {u.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {u.email}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onClose();
                              if (onSelectUser) onSelectUser(u);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center space-x-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Message</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Meetings */}
              {(activeTab === 'all' || activeTab === 'meetings') && results.meetings.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Meetings ({results.meetings.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {results.meetings.map((m) => (
                      <div
                        key={m._id || m.id}
                        className="p-2.5 rounded-xl border border-white/5 dark:border-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 flex items-center justify-between hover:border-cyan-500/30 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-cyan-400">
                              {m.meetingId}
                            </span>
                            <span className="text-xs font-semibold text-white dark:text-white light:text-slate-900 truncate">
                              {m.title}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {m.scheduledFor
                              ? `Scheduled for ${new Date(m.scheduledFor).toLocaleDateString()}`
                              : `Created ${new Date(m.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            if (onJoinMeeting) onJoinMeeting(m.meetingId);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition-colors flex items-center space-x-1"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Join</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Files */}
              {(activeTab === 'all' || activeTab === 'files') && results.files.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Files ({results.files.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {results.files.map((f) => (
                      <div
                        key={f._id || f.id}
                        className="p-2.5 rounded-xl border border-white/5 dark:border-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 flex items-center justify-between hover:border-emerald-500/30 transition-all"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white dark:text-white light:text-slate-900 truncate block">
                            {f.fileName || f.originalName}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {Math.round((f.fileSize || 0) / 1024)} KB • Uploaded by{' '}
                            {f.uploadedBy || 'User'}
                          </span>
                        </div>
                        <a
                          href={fileAPI.getDownloadUrl(f._id || f.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Messages */}
              {(activeTab === 'all' || activeTab === 'messages') && results.messages.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                    <span>Messages ({results.messages.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {results.messages.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl border border-white/5 dark:border-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-bold text-violet-400">{m.senderName}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-200 dark:text-slate-200 light:text-slate-800 line-clamp-2">
                          "{m.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
