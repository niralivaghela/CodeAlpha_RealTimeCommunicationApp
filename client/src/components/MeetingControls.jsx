import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  Smile,
  MessageSquare,
  FolderOpen,
  Edit3,
  Users,
  Settings,
  PhoneOff,
  FileText,
  BarChart2,
  HelpCircle,
  Disc,
  Camera,
  Activity,
} from 'lucide-react';

const EMOJIS = ['👍', '❤️', '😂', '👏', '🎉', '😮'];

const MeetingControls = ({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  isHandRaised,
  isRecording = false,
  unreadCount = 0,
  participantCount = 1,
  activePanel,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRaiseHand,
  onSendReaction,
  onTogglePanel,
  onToggleRecord,
  onTakeSnapshot,
  onOpenDiagnostics,
  onOpenSettings,
  onLeaveMeeting,
}) => {
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  const handleSelectReaction = (emoji) => {
    onSendReaction(emoji);
    setShowReactionsMenu(false);
  };

  return (
    <div className="w-full h-20 flex items-center justify-center p-3 z-30 select-none relative">
      {/* Floating Reactions Popup */}
      {showReactionsMenu && (
        <div className="absolute bottom-20 flex items-center space-x-2 px-3 py-2 rounded-2xl glass-dock border border-white/10 shadow-2xl animate-fadeIn">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelectReaction(emoji)}
              className="text-2xl p-1.5 rounded-xl hover:bg-white/10 hover:scale-125 transition-transform"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center space-x-1.5 sm:space-x-2.5 px-3 sm:px-4 py-2 rounded-2xl glass-dock">
        {/* Audio Mute/Unmute */}
        <button
          onClick={onToggleAudio}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center group relative ${
            isAudioMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title={isAudioMuted ? 'Unmute Mic (M)' : 'Mute Mic (M)'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
        </button>

        {/* Video Camera Toggle */}
        <button
          onClick={onToggleVideo}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isVideoMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title={isVideoMuted ? 'Turn Camera On (C)' : 'Turn Camera Off (C)'}
        >
          {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-indigo-400" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isScreenSharing
              ? 'bg-cyan-500/30 text-cyan-300 hover:bg-cyan-500/40 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title={isScreenSharing ? 'Stop Screen Share (S)' : 'Share Screen (S)'}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5 text-cyan-300" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* Raise Hand */}
        <button
          onClick={onToggleRaiseHand}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isHandRaised
              ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-lg shadow-amber-500/25 animate-pulse'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title={isHandRaised ? 'Lower Hand (H)' : 'Raise Hand (H)'}
        >
          <Hand className="w-5 h-5" />
        </button>

        {/* Reactions Toggle */}
        <button
          onClick={() => setShowReactionsMenu(!showReactionsMenu)}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            showReactionsMenu
              ? 'bg-indigo-600 text-white border border-indigo-400/50 shadow-md'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="Send Reaction"
        >
          <Smile className="w-5 h-5 text-amber-400" />
        </button>

        <div className="w-[1px] h-8 bg-white/10 mx-1 hidden md:block" />

        {/* Collaborative Whiteboard */}
        <button
          onClick={() => onTogglePanel('whiteboard')}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            activePanel === 'whiteboard'
              ? 'bg-brand-600 text-white border border-brand-400/50 shadow-lg shadow-brand-500/25'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="Collaborative Whiteboard"
        >
          <Edit3 className="w-5 h-5 text-amber-300" />
        </button>

        {/* Real-Time Chat */}
        <button
          onClick={() => onTogglePanel('chat')}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center relative ${
            activePanel === 'chat'
              ? 'bg-brand-600 text-white border border-brand-400/50 shadow-lg shadow-brand-500/25'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="Meeting Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {/* File Sharing Vault */}
        <button
          onClick={() => onTogglePanel('files')}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            activePanel === 'files'
              ? 'bg-brand-600 text-white border border-brand-400/50 shadow-lg shadow-brand-500/25'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="File Sharing Vault (Max 15MB)"
        >
          <FolderOpen className="w-5 h-5" />
        </button>

        {/* Collaborative Notes */}
        <button
          onClick={() => onTogglePanel('notes')}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            activePanel === 'notes'
              ? 'bg-brand-600 text-white border border-brand-400/50 shadow-lg shadow-brand-500/25'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="Meeting Notes"
        >
          <FileText className="w-5 h-5 text-indigo-300" />
        </button>

        {/* Live Polls */}
        <button
          onClick={() => onTogglePanel('polls')}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            activePanel === 'polls'
              ? 'bg-brand-600 text-white border border-brand-400/50 shadow-lg shadow-brand-500/25'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="Live Polls"
        >
          <BarChart2 className="w-5 h-5 text-purple-300" />
        </button>

        {/* Audience Q&A */}
        <button
          onClick={() => onTogglePanel('qna')}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            activePanel === 'qna'
              ? 'bg-brand-600 text-white border border-brand-400/50 shadow-lg shadow-brand-500/25'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="Audience Q&A"
        >
          <HelpCircle className="w-5 h-5 text-emerald-300" />
        </button>

        {/* Participant List */}
        <button
          onClick={() => onTogglePanel('participants')}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center relative ${
            activePanel === 'participants'
              ? 'bg-brand-600 text-white border border-brand-400/50 shadow-lg shadow-brand-500/25'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
          }`}
          title="Participants"
        >
          <Users className="w-5 h-5" />
          <span className="ml-1 text-[11px] font-bold hidden sm:inline text-slate-300">
            {participantCount}
          </span>
        </button>

        <div className="w-[1px] h-8 bg-white/10 mx-1 hidden lg:block" />

        {/* Real Recording Toggle */}
        <button
          onClick={onToggleRecord}
          className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
            isRecording
              ? 'bg-rose-500 text-white border border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse'
              : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 border border-white/10'
          }`}
          title={isRecording ? 'Stop Recording' : 'Record Session (Local WebM)'}
        >
          <Disc className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-rose-400'}`} />
        </button>

        {/* Snapshot / Screenshot Capture */}
        <button
          onClick={onTakeSnapshot}
          className="p-3 rounded-xl transition-all duration-200 flex items-center justify-center bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 border border-white/10"
          title="Take Snapshot (PNG)"
        >
          <Camera className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Diagnostics & Network Stats */}
        <button
          onClick={onOpenDiagnostics}
          className="p-3 rounded-xl transition-all duration-200 flex items-center justify-center bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 border border-white/10"
          title="Network Diagnostics & Latency"
        >
          <Activity className="w-5 h-5 text-amber-400" />
        </button>

        {/* Device Settings */}
        <button
          onClick={onOpenSettings}
          className="p-3 rounded-xl transition-all duration-200 flex items-center justify-center bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 border border-white/10"
          title="Settings & Shortcuts"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-8 bg-white/10 mx-1" />

        {/* Leave Meeting */}
        <button
          onClick={onLeaveMeeting}
          className="px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 font-semibold text-xs tracking-wide flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 border border-rose-400/30 transition-all duration-200"
          title="Leave Meeting"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
};

export default MeetingControls;
