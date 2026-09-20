import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogIn,
  Users,
  CheckCircle2,
} from 'lucide-react';

const CalendarView = ({
  meetings = [],
  onScheduleNew,
  onJoinMeeting,
}) => {
  const [viewMode, setViewMode] = useState('agenda'); // agenda | month | week
  const [filter, setFilter] = useState('upcoming'); // upcoming | all | today | completed

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filteredMeetings = meetings.filter((m) => {
    if (!m.scheduledFor) return filter === 'all';
    const meetDate = new Date(m.scheduledFor);
    if (filter === 'today') {
      return (
        meetDate.getFullYear() === now.getFullYear() &&
        meetDate.getMonth() === now.getMonth() &&
        meetDate.getDate() === now.getDate()
      );
    }
    if (filter === 'upcoming') {
      return meetDate >= startOfToday && m.status !== 'ended';
    }
    if (filter === 'completed') {
      return m.status === 'ended' || meetDate < startOfToday;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col rounded-2xl glass-panel border border-white/10 dark:border-white/10 light:border-slate-300 p-6 overflow-hidden">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-white/10 dark:border-white/10 light:border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white dark:text-white light:text-slate-900 tracking-tight flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <span>Scheduled Conferences</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View upcoming collaborative sessions across month, week, and agenda views
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* View mode toggle */}
          <div className="flex p-1 rounded-xl bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-200 border border-white/5 dark:border-white/5 light:border-slate-300 text-xs">
            {['agenda', 'week', 'month'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={onScheduleNew}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors flex items-center space-x-1.5 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 py-4 border-b border-white/5 dark:border-white/5 light:border-slate-200 text-xs overflow-x-auto">
        {[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'today', label: "Today's Sessions" },
          { id: 'all', label: 'All Scheduled' },
          { id: 'completed', label: 'Past & Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filter === tab.id
                ? 'bg-white/10 dark:bg-white/10 light:bg-slate-200 text-white dark:text-white light:text-slate-900 font-bold'
                : 'text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Calendar / Agenda View */}
      <div className="flex-1 overflow-y-auto pt-4">
        {filteredMeetings.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
            <CalendarIcon className="w-12 h-12 opacity-20 mb-3" />
            <p className="font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
              No meetings found for this filter
            </p>
            <p className="text-slate-500 text-[11px] mt-1">
              Click "Schedule Session" above to plan a future conference.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMeetings.map((m) => {
              const d = m.scheduledFor ? new Date(m.scheduledFor) : new Date(m.createdAt);
              const isPast = d < startOfToday || m.status === 'ended';

              return (
                <div
                  key={m.id || m._id}
                  className="p-4 rounded-2xl border border-white/5 dark:border-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    {/* Date Badge */}
                    <div className="p-3 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex flex-col items-center justify-center min-w-[54px] flex-shrink-0">
                      <span className="text-[10px] font-bold uppercase">
                        {d.toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-lg font-black">{d.getDate()}</span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          {m.meetingId}
                        </span>
                        <h4 className="text-sm font-bold text-white dark:text-white light:text-slate-900">
                          {m.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>
                            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {m.durationMinutes || 45} mins
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>
                            {m.hostName ? `Hosted by ${m.hostName}` : 'Organized session'}
                          </span>
                        </span>
                        {isPast && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button
                      onClick={() => onJoinMeeting && onJoinMeeting(m.meetingId)}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Join Room</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
