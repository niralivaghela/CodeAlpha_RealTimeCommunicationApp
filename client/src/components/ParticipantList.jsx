import React from 'react';
import {
  Users,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Hand,
  Crown,
  Lock,
  Unlock,
  UserX,
  VolumeX,
} from 'lucide-react';
import { getInitials, getAvatarGradient } from '../utils/avatar';

const ParticipantList = ({
  user,
  remoteUsers = {},
  remoteMediaStates = {},
  raisedHands = {},
  activeSpeakers = {},
  isLocalSpeaking = false,
  connectionQualities = {},
  isAudioMuted = false,
  isVideoMuted = false,
  isScreenSharing = false,
  isHandRaised = false,
  isHost = false,
  isRoomLocked = false,
  onHostMute,
  onHostRemove,
  onHostLockRoom,
  onHostEndMeetingForAll,
  onClose,
}) => {
  const remoteSocketIds = Object.keys(remoteUsers);
  const totalCount = 1 + remoteSocketIds.length;

  return (
    <div className="w-full sm:w-96 h-full flex flex-col border-l border-white/10 glass-panel z-30 select-none animate-fadeIn">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-brand-400" />
          <h3 className="font-bold text-sm text-white">
            Participants ({totalCount})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Host Controls Banner (visible if host) */}
      {isHost && (
        <div className="p-3 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-brand-300">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">Host Controls</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onHostLockRoom && onHostLockRoom(!isRoomLocked)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                isRoomLocked
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'
              }`}
              title={isRoomLocked ? 'Unlock meeting' : 'Lock meeting'}
            >
              {isRoomLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isRoomLocked ? 'Locked' : 'Lock'}</span>
            </button>

            {onHostEndMeetingForAll && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to end this meeting for all participants?')) {
                    onHostEndMeetingForAll();
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-sm"
                title="End meeting for everyone"
              >
                End for all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Participant Roster */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {/* Local User Tile */}
        <div
          className={`p-3 rounded-2xl bg-white/5 border transition-all flex items-center justify-between ${
            isLocalSpeaking ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/10' : 'border-brand-500/30'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarGradient(user?.name)} flex items-center justify-center font-bold text-xs text-white border border-white/20 relative`}
            >
              {getInitials(user?.name)}
              {isLocalSpeaking && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-white">
                  {user?.name || 'You'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 font-semibold">
                  You
                </span>
                {isHost && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold flex items-center space-x-0.5">
                    <Crown className="w-2.5 h-2.5" />
                    <span>Host</span>
                  </span>
                )}
                {isLocalSpeaking && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                    Speaking
                  </span>
                )}
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Excellent Connection</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400">
            {isHandRaised && (
              <span title="Raised Hand" className="p-1 rounded-lg bg-amber-500/20 text-amber-300 animate-bounce">
                <Hand className="w-3.5 h-3.5" />
              </span>
            )}
            {isScreenSharing && (
              <span title="Screen Sharing" className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Monitor className="w-3.5 h-3.5" />
              </span>
            )}
            <span
              className={`p-1.5 rounded-lg ${
                isVideoMuted ? 'text-rose-400 bg-rose-500/10' : 'text-indigo-400 bg-indigo-500/10'
              }`}
              title={isVideoMuted ? 'Camera Off' : 'Camera On'}
            >
              {isVideoMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </span>
            <span
              className={`p-1.5 rounded-lg ${
                isAudioMuted ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'
              }`}
              title={isAudioMuted ? 'Microphone Muted' : 'Microphone Active'}
            >
              {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </span>
          </div>
        </div>

        {/* Remote Users */}
        {remoteSocketIds.map((socketId) => {
          const remoteUser = remoteUsers[socketId];
          const mediaState = remoteMediaStates[socketId] || {};
          const isPeerHandRaised = raisedHands[socketId] || false;
          const isPeerSpeaking = activeSpeakers[socketId] || false;
          const quality = connectionQualities[socketId] || 'Good';
          const name = remoteUser?.name || 'Participant';
          const peerIsHost = remoteUser?.isHost;

          const qualityColor =
            quality === 'Excellent'
              ? 'text-emerald-400'
              : quality === 'Good'
              ? 'text-amber-400'
              : 'text-rose-400';
          const qualityDot =
            quality === 'Excellent'
              ? 'bg-emerald-400'
              : quality === 'Good'
              ? 'bg-amber-400'
              : 'bg-rose-400';

          return (
            <div
              key={socketId}
              className={`p-3 rounded-2xl bg-white/5 border transition-all flex items-center justify-between ${
                isPeerSpeaking
                  ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center space-x-3 overflow-hidden pr-2">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarGradient(name)} flex items-center justify-center font-bold text-xs text-white border border-white/20 flex-shrink-0 relative`}
                >
                  {getInitials(name)}
                  {isPeerSpeaking && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-ping" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {name}
                    </span>
                    {peerIsHost && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold flex items-center space-x-0.5">
                        <Crown className="w-2.5 h-2.5" />
                        <span>Host</span>
                      </span>
                    )}
                    {isPeerSpeaking && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                        Speaking
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${qualityColor} flex items-center space-x-1 mt-0.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${qualityDot}`} />
                    <span>{quality} Connection</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1 text-slate-400 flex-shrink-0">
                {isPeerHandRaised && (
                  <span title="Raised Hand" className="p-1 rounded-lg bg-amber-500/20 text-amber-300">
                    <Hand className="w-3.5 h-3.5" />
                  </span>
                )}
                {mediaState.isScreenSharing && (
                  <span title="Screen Sharing" className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Monitor className="w-3.5 h-3.5" />
                  </span>
                )}
                <span
                  className={`p-1.5 rounded-lg ${
                    mediaState.isCameraOff ? 'text-rose-400 bg-rose-500/10' : 'text-indigo-400 bg-indigo-500/10'
                  }`}
                >
                  {mediaState.isCameraOff ? (
                    <VideoOff className="w-3.5 h-3.5" />
                  ) : (
                    <Video className="w-3.5 h-3.5" />
                  )}
                </span>
                <span
                  className={`p-1.5 rounded-lg ${
                    mediaState.isMuted ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'
                  }`}
                >
                  {mediaState.isMuted ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </span>

                {/* Host Moderation Controls for this peer */}
                {isHost && (
                  <div className="flex items-center space-x-1 pl-1 ml-1 border-l border-white/10">
                    <button
                      onClick={() => onHostMute && onHostMute(socketId)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                      title="Mute this participant"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onHostRemove && onHostRemove(socketId)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                      title="Remove participant from room"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParticipantList;
