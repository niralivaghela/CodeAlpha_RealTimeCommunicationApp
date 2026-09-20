import React, { useState, useEffect, useRef } from 'react';
import {
  Minus,
  Square,
  Copy,
  X,
  Video,
  Wifi,
  Shield,
  Bell,
  MessageSquare,
  Users,
  FolderOpen,
  Calendar,
  Check,
  CheckCheck,
  Sun,
  Moon,
  Monitor,
  Search,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';

const DesktopTitleBar = ({ onOpenSearch, onOpenCommandPalette }) => {
  const { socket, connectionStatus, isConnected } = useSocket();
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'init-1',
      type: 'invite',
      title: 'Meeting invitation',
      detail: 'Daily Standup & Sync scheduled at 10:00 AM',
      time: 'Just now',
      unread: true,
    },
    {
      id: 'init-2',
      type: 'join',
      title: 'Participant joined',
      detail: 'Ready for peer-to-peer collaboration',
      time: '5m ago',
      unread: true,
    },
  ]);
  const dropdownRef = useRef(null);
  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationsOpen]);

  // Listen for socket events to populate real notifications
  useEffect(() => {
    if (!socket) return;

    const handleMsg = (data) => {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'message',
          title: `New message from ${data.senderName || 'Peer'}`,
          detail: data.message,
          time: 'Just now',
          unread: true,
        },
        ...prev.slice(0, 19),
      ]);
    };

    const handleJoin = (data) => {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'join',
          title: 'Participant joined',
          detail: `${data.name || 'A participant'} entered the room`,
          time: 'Just now',
          unread: true,
        },
        ...prev.slice(0, 19),
      ]);
    };

    const handleFile = (data) => {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'file',
          title: 'Files received',
          detail: `${data.fileName || 'Document'} shared in meeting`,
          time: 'Just now',
          unread: true,
        },
        ...prev.slice(0, 19),
      ]);
    };

    socket.on('receive-message', handleMsg);
    socket.on('user-joined', handleJoin);
    socket.on('file-shared', handleFile);

    return () => {
      socket.off('receive-message', handleMsg);
      socket.off('user-joined', handleJoin);
      socket.off('file-shared', handleFile);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  useEffect(() => {
    if (!isElectron) return;

    // Check initial maximized state
    window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});

    // Listen for maximize/unmaximize state changes
    if (window.electronAPI.onMaximizeChange) {
      window.electronAPI.onMaximizeChange((maximized) => {
        setIsMaximized(maximized);
      });
    }
  }, [isElectron]);

  const handleMinimize = () => {
    if (isElectron) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (isElectron) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (isElectron) {
      window.electronAPI.closeWindow();
    }
  };

  return (
    <div
      className="w-full h-9 bg-slate-950/90 dark:bg-slate-950/90 light:bg-white/95 border-b border-white/5 dark:border-white/5 light:border-slate-200 flex items-center justify-between px-3 select-none z-50 text-xs font-medium text-slate-300 dark:text-slate-300 light:text-slate-700 transition-colors duration-200"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: App Brand & Icon */}
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-md bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-sm">
          <Video className="w-2.5 h-2.5" />
        </div>
        <span className="font-extrabold tracking-wider bg-gradient-to-r from-white to-indigo-200 dark:from-white dark:to-indigo-200 light:from-slate-900 light:to-indigo-600 bg-clip-text text-transparent text-[11px] uppercase">
          Nexora Connect
        </span>
        <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 dark:text-brand-300 light:text-indigo-600 border border-brand-500/30 uppercase font-semibold">
          Pro
        </span>
      </div>

      {/* Center: Search & Quick Actions */}
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={() => {
            if (onOpenSearch) onOpenSearch();
            else window.dispatchEvent(new CustomEvent('open-command-palette'));
          }}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-white/5 dark:bg-white/5 light:bg-slate-100 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-600 text-[11px] border border-white/5 dark:border-white/5 light:border-slate-200 transition-all cursor-pointer"
        >
          <Search className="w-3 h-3 text-indigo-400" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="px-1.5 py-0.2 rounded bg-white/10 dark:bg-white/10 light:bg-slate-200 text-[9px] font-mono">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Theme Toggle, Notification Center, Connection Status & Window Controls */}
      <div className="flex items-center space-x-2 relative" style={{ WebkitAppRegion: 'no-drag' }} ref={dropdownRef}>
        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-100 transition-colors"
          title={`Active Theme: ${theme} (Click to switch)`}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
        </button>

        {/* Real Connection Status */}
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pr-1">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus.includes('Reconnecting')
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isConnected
              ? '🟢'
              : connectionStatus.includes('Reconnecting')
              ? '🟡'
              : '🔴'}
          </span>
        </div>

        {/* Notification Center Icon */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-1.5 rounded-lg transition-colors relative ${
              isNotificationsOpen
                ? 'bg-white/15 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Notification Center"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Center Popover Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-8 w-80 rounded-2xl glass-panel border border-white/10 shadow-2xl p-4 text-left z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-xs text-white">Notification Center</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No notifications</p>
                ) : (
                  notifications.map((n) => {
                    const IconComponent =
                      n.type === 'message'
                        ? MessageSquare
                        : n.type === 'join'
                        ? Users
                        : n.type === 'file'
                        ? FolderOpen
                        : Calendar;

                    const iconColor =
                      n.type === 'message'
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : n.type === 'join'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : n.type === 'file'
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-indigo-400 bg-indigo-500/10';

                    return (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 ${
                          n.unread
                            ? 'bg-white/10 border-indigo-500/30'
                            : 'bg-white/5 border-white/5 opacity-75'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${iconColor}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-white truncate">
                              {n.title}
                            </span>
                            <span className="text-[9px] text-slate-500">{n.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                            {n.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Windows Action Controls */}
        {isElectron && (
          <div className="flex items-center -mr-2">
            <button
              onClick={handleMinimize}
              className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isMaximized ? 'Restore Down' : 'Maximize'}
            >
              {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-2.5 h-2.5" />}
            </button>
            <button
              onClick={handleClose}
              className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopTitleBar;
