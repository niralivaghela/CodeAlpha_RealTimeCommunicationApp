import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, ArrowLeft, RotateCcw, Video, CheckCircle2 } from 'lucide-react';

const MeetingEndScreen = ({ meetingId, durationFormatted, participantCount, onRejoin }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl text-center relative animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Meeting Ended</h1>
        <p className="text-xs text-slate-400 mb-6">
          You have left the conference session. Here is your summary:
        </p>

        {/* Meeting Metrics Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
            <Clock className="w-5 h-5 text-indigo-400 mb-1" />
            <span className="text-[11px] text-slate-400">Duration</span>
            <span className="text-sm font-mono font-bold text-white mt-0.5">
              {durationFormatted || '00:00'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
            <Users className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-[11px] text-slate-400">Participants</span>
            <span className="text-sm font-mono font-bold text-white mt-0.5">
              {participantCount || 1}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono text-slate-300 mb-6">
          Meeting ID: <span className="text-indigo-300 font-bold">{meetingId}</span>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          {onRejoin && (
            <button
              onClick={onRejoin}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 border border-white/10"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rejoin Meeting</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingEndScreen;
