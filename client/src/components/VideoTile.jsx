import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Monitor, Hand } from 'lucide-react';
import { getInitials, getAvatarGradient } from '../utils/avatar';

const VideoTile = ({
  stream,
  userName = 'Participant',
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  isScreenSharing = false,
  isSpeaking = false,
  isHandRaised = false,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasActiveVideoTrack =
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.enabled);

  const showPlaceholder = isCameraOff || !hasActiveVideoTrack;
  const initials = getInitials(userName);
  const gradient = getAvatarGradient(userName);

  return (
    <div
      className={`relative w-full h-full min-h-[190px] rounded-3xl overflow-hidden bg-slate-900 border shadow-2xl flex items-center justify-center transition-all duration-300 ${
        isSpeaking
          ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-emerald-500/20'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          showPlaceholder ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        } ${isLocal && !isScreenSharing ? '-scale-x-100' : ''}`}
      />

      {/* Camera Off / Muted Avatar Placeholder */}
      {showPlaceholder && (
        <div className="flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
          <div className="relative mb-3">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center shadow-2xl border-2 border-white/20 ${
                isSpeaking ? 'animate-pulse' : ''
              }`}
            >
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-wider">
                {initials}
              </span>
            </div>
            {isMuted && (
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-rose-500 text-white shadow-lg border-2 border-slate-900">
                <MicOff className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <span className="text-sm font-semibold text-slate-200">
            {userName} {isLocal && <span className="text-indigo-400 font-bold">(You)</span>}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5">Camera is off</span>
        </div>
      )}

      {/* Screen Sharing Overlay */}
      {isScreenSharing && (
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md">
          <Monitor className="w-3.5 h-3.5 animate-pulse" />
          <span>Presenting Screen</span>
        </div>
      )}

      {/* Raised Hand Overlay */}
      {isHandRaised && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md animate-bounce">
          <Hand className="w-4 h-4 fill-amber-300" />
          <span>Raised Hand</span>
        </div>
      )}

      {/* Active Speaker Badge */}
      {isSpeaking && !isHandRaised && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-semibold flex items-center space-x-1 backdrop-blur-md animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Speaking</span>
        </div>
      )}

      {/* Bottom Information Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-950/75 border border-white/10 backdrop-blur-md text-xs text-white max-w-[80%] truncate">
          <span className="truncate font-medium">
            {userName} {isLocal && <span className="text-indigo-400 font-bold">(You)</span>}
          </span>
        </div>

        <div
          className={`p-1.5 rounded-xl backdrop-blur-md border ${
            isMuted
              ? 'bg-rose-500/80 text-white border-rose-400/30'
              : 'bg-emerald-500/80 text-white border-emerald-400/30'
          }`}
          title={isMuted ? 'Microphone Muted' : 'Microphone Active'}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
