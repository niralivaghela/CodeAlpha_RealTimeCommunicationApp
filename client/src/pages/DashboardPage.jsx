import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { meetingAPI, authAPI, systemAPI } from '../services/api';
import DesktopSidebar from '../components/DesktopSidebar';
import CreateMeetingModal from '../components/CreateMeetingModal';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';
import ProfileModal from '../components/ProfileModal';
import SettingsModal from '../components/SettingsModal';
import WhiteboardModal from '../components/WhiteboardModal';
import CommandPalette from '../components/CommandPalette';
import GlobalSearchModal from '../components/GlobalSearchModal';
import ContactsPanel from '../components/ContactsPanel';
import DirectMessagesPanel from '../components/DirectMessagesPanel';
import CalendarView from '../components/CalendarView';
import { getInitials, getAvatarGradient } from '../utils/avatar';
import {
  Video,
  Plus,
  LogIn,
  Clock,
  Calendar,
  Shield,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Users,
  Sun,
  Moon,
  Sunrise,
  Share2,
  TrendingUp,
  MessageSquare,
  FolderOpen,
  Edit3,
  Star,
  Search,
  ExternalLink,
  Monitor,
  Activity,
  CheckCircle2,
} from 'lucide-react';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'meetings' | 'contacts' | 'messages' | 'files' | 'whiteboards' | 'favorites' | 'settings'
  const [joinMeetingId, setJoinMeetingId] = useState('');
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    meetingsToday: 0,
    participants: 0,
    meetingHours: 0,
  });

  const [meetingFilterTab, setMeetingFilterTab] = useState('recent'); // 'recent' | 'upcoming'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  // Ultimate Pro Modals & Views
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [dmRecipient, setDmRecipient] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  // Dynamic Greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: Sunrise };
    if (hour < 18) return { text: 'Good afternoon', icon: Sun };
    return { text: 'Good evening', icon: Moon };
  };

  const { text: greetingText, icon: GreetingIcon } = getGreeting();

  // Load user meetings and stats
  const fetchMeetings = async () => {
    try {
      const res = await meetingAPI.getUserMeetings();
      if (res.data) {
        if (res.data.meetings) setRecentMeetings(res.data.meetings);
        if (res.data.upcoming) setUpcomingMeetings(res.data.upcoming);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.warn('Failed to load user meetings:', err.message);
    }
  };

  // Load contacts directory
  const fetchContacts = async () => {
    try {
      const res = await authAPI.getUsers();
      if (res.data && res.data.users) {
        setContacts(res.data.users.filter((u) => u.id !== (user?.id || user?._id)));
      }
    } catch (err) {
      console.warn('Failed to load contacts:', err.message);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchContacts();

    // Load favorites from local storage
    try {
      const saved = localStorage.getItem('nexora_favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch (e) {}

    // Load initial activity logs
    systemAPI.getActivityLogs().then((res) => {
      if (res.data && res.data.logs) {
        setActivityLogs(res.data.logs);
      }
    }).catch(() => {});

    // Ctrl+K command palette shortcut
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    const handleOpenSearch = () => setIsSearchModalOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenPalette);
    window.addEventListener('open-global-search', handleOpenSearch);

    // Register Electron Tray IPC triggers
    if (window.electronAPI) {
      if (window.electronAPI.onTriggerNewMeeting) {
        window.electronAPI.onTriggerNewMeeting(() => {
          setIsCreateModalOpen(true);
        });
      }
      if (window.electronAPI.onTriggerJoinMeeting) {
        window.electronAPI.onTriggerJoinMeeting(() => {
          const el = document.getElementById('dashboard-join-input');
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
      if (window.electronAPI.onTriggerSettings) {
        window.electronAPI.onTriggerSettings(() => {
          setIsSettingsModalOpen(true);
        });
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenPalette);
      window.removeEventListener('open-global-search', handleOpenSearch);
    };
  }, []);

  const handleCommandSelect = (cmd) => {
    switch (cmd.action) {
      case 'new-meeting':
        setIsCreateModalOpen(true);
        break;
      case 'schedule-meeting':
        setIsScheduleModalOpen(true);
        break;
      case 'join-meeting': {
        const el = document.getElementById('dashboard-join-input');
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      }
      case 'whiteboard':
        setIsWhiteboardOpen(true);
        break;
      case 'settings':
        setIsSettingsModalOpen(true);
        break;
      case 'contacts':
        setActiveTab('contacts');
        break;
      case 'messages':
        setActiveTab('messages');
        break;
      case 'calendar':
        setActiveTab('meetings');
        break;
      case 'search':
        setIsSearchModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleStartDM = (targetUser) => {
    setDmRecipient(targetUser);
    setActiveTab('messages');
  };

  // Join meeting handler
  const handleJoinMeeting = async (e) => {
    if (e) e.preventDefault();
    if (!joinMeetingId.trim()) {
      setError('Please enter a valid Meeting ID (e.g. NX-7K92-PQ).');
      return;
    }

    const cleanId = joinMeetingId.trim().toUpperCase();
    setIsJoining(true);
    setError(null);

    try {
      await meetingAPI.verifyMeeting(cleanId);
      navigate(`/meeting/${cleanId}`);
    } catch (err) {
      console.error('Join meeting error:', err);
      const msg = err.response?.data?.error || 'Meeting not found. Please verify the Meeting ID.';
      setError(msg);
      setIsJoining(false);
    }
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyDeepLink = (id) => {
    const deepLink = `nexora://meeting/${id}`;
    navigator.clipboard.writeText(deepLink);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const toggleFavorite = (meeting) => {
    const exists = favorites.some((f) => f.meetingId === meeting.meetingId);
    let next;
    if (exists) {
      next = favorites.filter((f) => f.meetingId !== meeting.meetingId);
    } else {
      next = [...favorites, meeting];
    }
    setFavorites(next);
    localStorage.setItem('nexora_favorites', JSON.stringify(next));
  };

  const handleSidebarTab = (tabId) => {
    if (tabId === 'settings') {
      setIsSettingsModalOpen(true);
    } else if (tabId === 'whiteboards') {
      setIsWhiteboardOpen(true);
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Nexora Desktop Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onSelectTab={handleSidebarTab}
        user={user}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 relative">
        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs underline hover:no-underline">
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <div>
            {/* Welcome Banner */}
            <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden glass-panel border border-white/10 mb-8 shadow-2xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-brand-600/20 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-3">
                  <GreetingIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>{greetingText}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome to Nexora Connect, {user?.name || 'Collaborator'}
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Real-time Windows desktop communication platform with WebRTC peer video, active speaker tracking, canvas whiteboard studio, and instant file vault.
                </p>
              </div>
            </div>

            {/* Metrics Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 group hover:border-brand-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Total Meetings</span>
                  <div className="w-8 h-8 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center border border-brand-500/20">
                    <Video className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats.totalMeetings}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Hosted sessions to date</p>
              </div>

              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 group hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Meetings Today</span>
                  <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats.meetingsToday}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Active today</p>
              </div>

              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Participants</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats.participants}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Connected peer nodes</p>
              </div>

              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 group hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Meeting Hours</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats.meetingHours}h
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Total conference time</p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Action 1: New Meeting */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-brand-500/40 transition-all group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">New Meeting</h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Instant room with custom audio/video entry options.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors"
                >
                  + Instant Meeting
                </button>
              </div>

              {/* Action 2: Join Meeting */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-cyan-500/40 transition-all group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <LogIn className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Join Meeting</h3>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Connect via Meeting ID (e.g. <span className="font-mono text-cyan-300">NX-7K92-PQ</span>).
                  </p>
                  <input
                    id="dashboard-join-input"
                    type="text"
                    value={joinMeetingId}
                    onChange={(e) => setJoinMeetingId(e.target.value)}
                    placeholder="NX-XXXX-XX"
                    className="w-full bg-slate-950/70 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase font-mono mb-3"
                  />
                </div>
                <button
                  onClick={handleJoinMeeting}
                  disabled={isJoining || !joinMeetingId.trim()}
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {isJoining ? 'Connecting...' : 'Join Room'}
                </button>
              </div>

              {/* Action 3: Schedule Meeting */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-purple-500/40 transition-all group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Schedule Meeting</h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Plan sessions with date, time, and invitations.
                  </p>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                >
                  Schedule Session
                </button>
              </div>

              {/* Action 4: Whiteboard Studio */}
              <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Whiteboard Studio</h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Live drawing canvas with shapes, highlighter, & PNG export.
                  </p>
                </div>
                <button
                  onClick={() => setIsWhiteboardOpen(true)}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                >
                  Open Canvas
                </button>
              </div>
            </div>

            {/* Meeting Hub: Filterable Recent & Upcoming */}
            <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Your Meetings Hub</h3>
                </div>

                <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setMeetingFilterTab('recent')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      meetingFilterTab === 'recent'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Recent ({recentMeetings.length})
                  </button>
                  <button
                    onClick={() => setMeetingFilterTab('upcoming')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      meetingFilterTab === 'upcoming'
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Upcoming ({upcomingMeetings.length})
                  </button>
                </div>
              </div>

              {/* Recent Meetings */}
              {meetingFilterTab === 'recent' ? (
                recentMeetings.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Calendar className="w-9 h-9 mx-auto mb-2 opacity-30 text-indigo-400" />
                    <p className="text-xs font-medium text-slate-400">No previous meetings found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Start a new instant meeting to see your session history here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentMeetings.map((m) => (
                      <div
                        key={m.id || m.meetingId}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-500/30 transition-all flex flex-col justify-between group shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold text-indigo-300 tracking-wider">
                              {m.meetingId}
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => toggleFavorite(m)}
                                className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                                title="Favorite Room"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    favorites.some((f) => f.meetingId === m.meetingId)
                                      ? 'fill-amber-400 text-amber-400'
                                      : ''
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  m.status === 'active'
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                          </div>
                          <h4 className="text-sm font-semibold text-white truncate mb-1">
                            {m.title || 'Instant Meeting'}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {new Date(m.createdAt).toLocaleDateString()} at{' '}
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => copyId(m.meetingId)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 text-xs flex items-center space-x-1"
                              title="Copy ID"
                            >
                              {copiedId === m.meetingId ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span className="text-[10px]">
                                {copiedId === m.meetingId ? 'Copied' : 'ID'}
                              </span>
                            </button>

                            <button
                              onClick={() => copyDeepLink(m.meetingId)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 text-xs flex items-center space-x-1"
                              title="Copy Desktop Deep Link (nexora://)"
                            >
                              {copiedLink === m.meetingId ? (
                                <Check className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <Share2 className="w-3 h-3" />
                              )}
                              <span className="text-[10px]">
                                {copiedLink === m.meetingId ? 'Copied' : 'Link'}
                              </span>
                            </button>
                          </div>

                          <button
                            onClick={() => navigate(`/meeting/${m.meetingId}`)}
                            className="px-3 py-1.5 rounded-xl bg-brand-600/30 hover:bg-brand-600 text-brand-200 hover:text-white border border-brand-500/30 text-xs font-semibold transition-all flex items-center space-x-1"
                          >
                            <span>Join</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Upcoming Scheduled */
                upcomingMeetings.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Calendar className="w-9 h-9 mx-auto mb-2 opacity-30 text-purple-400" />
                    <p className="text-xs font-medium text-slate-400">No scheduled meetings</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click "Schedule Session" above to plan a conference in advance.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingMeetings.map((m) => (
                      <div
                        key={m.id || m.meetingId}
                        className="p-4 rounded-2xl bg-white/5 border border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-md"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold text-purple-300 tracking-wider">
                              {m.meetingId}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              {m.durationMinutes || 45} mins
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-white truncate mb-1">
                            {m.title || 'Scheduled Conference'}
                          </h4>
                          <p className="text-[11px] text-purple-300 font-medium">
                            {new Date(m.scheduledFor).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(m.scheduledFor).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <button
                            onClick={() => copyDeepLink(m.meetingId)}
                            className="p-1 rounded text-slate-400 hover:text-white text-xs flex items-center space-x-1"
                            title="Copy nexora:// link"
                          >
                            <Share2 className="w-3 h-3" />
                            <span className="text-[10px]">Copy Link</span>
                          </button>

                          <button
                            onClick={() => navigate(`/meeting/${m.meetingId}`)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all flex items-center space-x-1"
                          >
                            <span>Start Now</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* System & Security Activity Audit Trail */}
            <div className="mt-8 glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">System & Security Activity Trail</h3>
                    <p className="text-[11px] text-slate-400">Live immutable audit log of workspace sessions & authentication</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Verified Secure</span>
                </span>
              </div>

              {activityLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Audit trail active. User sessions and security events will log here automatically.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activityLogs.slice(0, 5).map((log) => (
                    <div
                      key={log._id || log.id || Math.random()}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-white uppercase tracking-wider text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-white/10 mr-2">
                            {log.action}
                          </span>
                          <span className="text-slate-300">{log.details || 'Security event logged'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEDICATED CALENDAR & MEETINGS VIEW */}
        {activeTab === 'meetings' && (
          <CalendarView
            meetings={[...recentMeetings, ...upcomingMeetings]}
            onJoinMeeting={(id) => navigate(`/meeting/${id}`)}
            onScheduleNew={() => setIsScheduleModalOpen(true)}
          />
        )}

        {/* TAB 3: CONTACTS DIRECTORY & ADDRESS BOOK */}
        {activeTab === 'contacts' && (
          <ContactsPanel
            currentUserId={user?.id || user?._id}
            onStartChat={handleStartDM}
            onStartCall={() => setIsCreateModalOpen(true)}
          />
        )}

        {/* TAB 4: 1-TO-1 DIRECT MESSAGING */}
        {activeTab === 'messages' && (
          <DirectMessagesPanel
            initialSelectedUser={dmRecipient}
            onStartCall={() => setIsCreateModalOpen(true)}
          />
        )}

        {/* TAB 5: FAVORITES */}
        {activeTab === 'favorites' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Favorite Meeting Rooms</h2>
              <p className="text-xs text-slate-400">Quick 1-click access to your bookmarked rooms</p>
            </div>

            {favorites.length === 0 ? (
              <div className="py-16 text-center text-slate-500 glass-panel rounded-3xl border border-white/10">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-400" />
                <p className="text-sm font-medium text-slate-300">No favorite rooms bookmarked yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click the star icon on any meeting in your dashboard to save it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((m) => (
                  <div
                    key={m.meetingId}
                    className="p-5 rounded-2xl glass-panel border border-amber-500/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-amber-300">{m.meetingId}</span>
                        <button onClick={() => toggleFavorite(m)} className="text-amber-400">
                          <Star className="w-4 h-4 fill-amber-400" />
                        </button>
                      </div>
                      <h4 className="text-sm font-semibold text-white truncate">{m.title}</h4>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => navigate(`/meeting/${m.meetingId}`)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FILES VAULT */}
        {activeTab === 'files' && (
          <div className="py-16 text-center glass-panel rounded-3xl border border-white/10 p-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-300 flex items-center justify-center mx-auto mb-3 border border-indigo-500/30">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white capitalize">Meeting Files Vault</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Real-time Socket.IO chat messaging and the 15MB file sharing vault are integrated directly inside your live meeting rooms.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/25"
            >
              Start Meeting to Collaborate
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateMeetingModal
          onClose={() => setIsCreateModalOpen(false)}
          onMeetingCreated={fetchMeetings}
        />
      )}

      {isScheduleModalOpen && (
        <ScheduleMeetingModal
          onClose={() => setIsScheduleModalOpen(false)}
          onScheduled={fetchMeetings}
        />
      )}

      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}

      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}

      {isWhiteboardOpen && (
        <WhiteboardModal
          meetingId="NX-STANDALONE"
          socket={socket}
          onClose={() => setIsWhiteboardOpen(false)}
        />
      )}

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectCommand={handleCommandSelect}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
