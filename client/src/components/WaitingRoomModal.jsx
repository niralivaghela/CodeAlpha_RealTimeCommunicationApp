import React from 'react';
import { UserCheck, UserX, Clock, Loader2, ShieldAlert } from 'lucide-react';

export const HostWaitingRoomBanner = ({ queue = [], onAdmit, onReject }) => {
  if (!queue || queue.length === 0) return null;

  return (
    <div className="bg-indigo-600/90 text-white px-4 py-2.5 flex items-center justify-between shadow-lg backdrop-blur-sm z-30 animate-fadeIn border-b border-indigo-400/30">
      <div className="flex items-center space-x-2 text-xs">
        <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
        <span className="font-semibold">
          {queue.length === 1
            ? `${queue[0].name} is waiting in the lobby`
            : `${queue.length} participants waiting for admission`}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {queue.slice(0, 2).map((item) => (
          <div key={item.socketId} className="flex items-center space-x-1.5 text-xs">
            <span className="font-bold">{item.name}</span>
            <button
              onClick={() => onAdmit(item.socketId)}
              className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[10px] transition-colors flex items-center space-x-0.5"
            >
              <UserCheck className="w-3 h-3" />
              <span>Admit</span>
            </button>
            <button
              onClick={() => onReject(item.socketId)}
              className="px-2 py-0.5 rounded bg-rose-500/80 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors flex items-center space-x-0.5"
            >
              <UserX className="w-3 h-3" />
              <span>Decline</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const GuestWaitingScreen = ({ meetingTitle, onCancel }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl glass-panel border border-white/10 text-center shadow-2xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 shadow-lg shadow-indigo-600/20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Waiting for Host Admission
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            The host has been notified that you are in the lobby. You will join automatically once admitted.
          </p>
          {meetingTitle && (
            <div className="mt-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 inline-block text-xs font-mono text-cyan-300">
              {meetingTitle}
            </div>
          )}
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors border border-white/10"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
