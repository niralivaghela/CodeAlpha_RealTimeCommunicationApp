import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Video,
  LogIn,
  Calendar,
  MessageSquare,
  Users,
  FolderOpen,
  Edit3,
  Settings,
  Sun,
  Moon,
  Monitor,
  Activity,
  X,
  Mic,
  Share2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const CommandPalette = ({
  isOpen,
  onClose,
  onNewMeeting,
  onJoinMeeting,
  onScheduleMeeting,
  onNavigateTab,
  onOpenSettings,
}) => {
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const actions = [
    {
      id: 'new-meeting',
      label: 'Start New Meeting',
      category: 'Meetings',
      icon: Video,
      color: 'text-indigo-400 bg-indigo-500/10',
      action: () => {
        onClose();
        if (onNewMeeting) onNewMeeting();
      },
    },
    {
      id: 'join-meeting',
      label: 'Join Meeting via ID',
      category: 'Meetings',
      icon: LogIn,
      color: 'text-cyan-400 bg-cyan-500/10',
      action: () => {
        onClose();
        if (onJoinMeeting) onJoinMeeting();
      },
    },
    {
      id: 'schedule-meeting',
      label: 'Schedule Future Session',
      category: 'Meetings',
      icon: Calendar,
      color: 'text-emerald-400 bg-emerald-500/10',
      action: () => {
        onClose();
        if (onScheduleMeeting) onScheduleMeeting();
      },
    },
    {
      id: 'tab-messages',
      label: 'Open Direct Messages',
      category: 'Navigation',
      icon: MessageSquare,
      color: 'text-violet-400 bg-violet-500/10',
      action: () => {
        onClose();
        if (onNavigateTab) onNavigateTab('messages');
      },
    },
    {
      id: 'tab-contacts',
      label: 'Open Contacts Directory',
      category: 'Navigation',
      icon: Users,
      color: 'text-blue-400 bg-blue-500/10',
      action: () => {
        onClose();
        if (onNavigateTab) onNavigateTab('contacts');
      },
    },
    {
      id: 'tab-meetings',
      label: 'View Calendar & Meetings',
      category: 'Navigation',
      icon: Calendar,
      color: 'text-amber-400 bg-amber-500/10',
      action: () => {
        onClose();
        if (onNavigateTab) onNavigateTab('meetings');
      },
    },
    {
      id: 'tab-whiteboard',
      label: 'Open Collaborative Whiteboard',
      category: 'Collaboration',
      icon: Edit3,
      color: 'text-rose-400 bg-rose-500/10',
      action: () => {
        onClose();
        if (onNavigateTab) onNavigateTab('whiteboards');
      },
    },
    {
      id: 'tab-files',
      label: 'Open Shared File Vault',
      category: 'Collaboration',
      icon: FolderOpen,
      color: 'text-emerald-400 bg-emerald-500/10',
      action: () => {
        onClose();
        if (onNavigateTab) onNavigateTab('files');
      },
    },
    {
      id: 'theme-light',
      label: 'Switch to Light Theme',
      category: 'Theme',
      icon: Sun,
      color: 'text-amber-400 bg-amber-500/10',
      action: () => {
        setTheme('light');
        onClose();
      },
    },
    {
      id: 'theme-dark',
      label: 'Switch to Dark Theme',
      category: 'Theme',
      icon: Moon,
      color: 'text-indigo-400 bg-indigo-500/10',
      action: () => {
        setTheme('dark');
        onClose();
      },
    },
    {
      id: 'theme-system',
      label: 'Follow System Theme',
      category: 'Theme',
      icon: Monitor,
      color: 'text-cyan-400 bg-cyan-500/10',
      action: () => {
        setTheme('system');
        onClose();
      },
    },
    {
      id: 'open-settings',
      label: 'Open System Preferences & Diagnostics',
      category: 'Settings',
      icon: Settings,
      color: 'text-slate-400 bg-slate-500/10',
      action: () => {
        onClose();
        if (onOpenSettings) onOpenSettings();
      },
    },
  ];

  const filtered = actions.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl glass-panel border border-white/10 dark:border-white/10 light:border-slate-300 dark:bg-slate-900/95 light:bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 dark:border-white/10 light:border-slate-200">
          <Search className="w-5 h-5 text-indigo-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search actions (Ctrl+K)..."
            className="w-full bg-transparent text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-white/5 dark:bg-white/5 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No actions matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : item.color
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded ${
                      isSelected
                        ? 'text-indigo-200 bg-white/10'
                        : 'text-slate-500 bg-white/5 dark:bg-white/5 light:bg-slate-200/60'
                    }`}
                  >
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-50 border-t border-white/5 dark:border-white/5 light:border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-2">
            <span>Navigate: ↑ ↓</span>
            <span>•</span>
            <span>Select: Enter</span>
          </div>
          <span>Nexora Connect Quick Actions</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
