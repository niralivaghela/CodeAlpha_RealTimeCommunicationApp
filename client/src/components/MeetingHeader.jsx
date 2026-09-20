import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Clock, Wifi, Shield } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const MeetingHeader = ({ meetingId, participantCount }) => {
  const { connectionStatus, isConnected } = useSocket();
  const [copied, setCopied] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSec) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyMeetingId = () => {
    if (meetingId) {
      navigator.clipboard.writeText(meetingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full h-14 border-b border-white/10 glass-panel px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Room Info */}
      <div className="flex items-center space-x-3">
        <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent hidden sm:inline-block">
          NEXORA CONNECT
        </span>
        <span className="hidden sm:inline text-white/20">|</span>
        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
          <span className="text-xs text-slate-400">Meeting:</span>
          <span className="text-xs font-mono font-bold text-indigo-300 tracking-wider">
            {meetingId || 'CONNECTING...'}
          </span>
          <button
            onClick={copyMeetingId}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Copy Meeting ID (and nexora:// link)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Status, Participants, & Timer */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Connection status */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus.includes('Reconnecting')
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="hidden md:inline text-[11px] font-medium text-slate-300">
            {isConnected
              ? '🟢 Connected'
              : connectionStatus.includes('Reconnecting')
              ? '🟡 Reconnecting'
              : '🔴 Disconnected'}
          </span>
        </div>

        {/* Participant Count */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{String(participantCount).padStart(2, '0')} Participants</span>
        </div>

        {/* Timer */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-indigo-300 font-semibold">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{formatTime(seconds)}</span>
        </div>
      </div>
    </div>
  );
};

export default MeetingHeader;
