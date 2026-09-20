import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { meetingAPI } from '../services/api';

import MeetingHeader from '../components/MeetingHeader';
import VideoGrid from '../components/VideoGrid';
import MeetingControls from '../components/MeetingControls';
import ChatPanel from '../components/ChatPanel';
import FileSharePanel from '../components/FileSharePanel';
import ParticipantList from '../components/ParticipantList';
import WhiteboardModal from '../components/WhiteboardModal';
import MeetingLobby from '../components/MeetingLobby';
import SettingsModal from '../components/SettingsModal';
import MeetingEndScreen from '../components/MeetingEndScreen';
import ReactionsOverlay from '../components/ReactionsOverlay';
import MeetingNotesPanel from '../components/MeetingNotesPanel';
import MeetingPollsPanel from '../components/MeetingPollsPanel';
import MeetingQnAPanel from '../components/MeetingQnAPanel';
import { HostWaitingRoomBanner, GuestWaitingScreen } from '../components/WaitingRoomModal';
import ConnectionDiagnosticsModal from '../components/ConnectionDiagnosticsModal';
import { AlertCircle, Loader2 } from 'lucide-react';

const MeetingRoomPage = () => {
  const { id: rawMeetingId } = useParams();
  const meetingId = rawMeetingId ? rawMeetingId.trim().toUpperCase() : '';
  const navigate = useNavigate();

  const { user } = useAuth();
  const { socket } = useSocket();

  // Navigation & Lobby states
  const [isInLobby, setIsInLobby] = useState(true);
  const [lobbyOptions, setLobbyOptions] = useState({
    isMuted: false,
    isCameraOff: false,
    selectedAudioDevice: '',
    selectedVideoDevice: '',
  });

  // Call & Meeting state
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState(null);
  const [isMeetingEnded, setIsMeetingEnded] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState('00:00');
  const [finalParticipantCount, setFinalParticipantCount] = useState(1);

  // Panels & Overlays
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'files' | 'participants' | 'whiteboard' | 'notes' | 'polls' | 'qna' | null
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState(null);

  // Ultimate Pro: Waiting Room & Local Recording states
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);
  const [waitingQueue, setWaitingQueue] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Call duration and recording refs
  const timerStartRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Initialize WebRTC only after joining from lobby
  const {
    localStream,
    remoteStreams,
    remoteUsers,
    remoteMediaStates,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    isHandRaised,
    raisedHands,
    activeSpeakers,
    isLocalSpeaking,
    reactions,
    mediaError,
    isRoomLocked,
    connectionQualities,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleRaiseHand,
    sendReaction,
    hostMutePeer,
    hostRemovePeer,
    hostLockRoom,
    endMeetingForAll,
    leaveMeeting,
  } = useWebRTC(isInLobby ? null : meetingId, user, socket, lobbyOptions);

  // Validate meeting exists and is active
  useEffect(() => {
    const verifyRoom = async () => {
      try {
        const res = await meetingAPI.verifyMeeting(meetingId);
        setMeetingDetails(res.data.meeting);
        setIsValidating(false);
      } catch (err) {
        console.error('Room verification failed:', err);
        const msg = err.response?.data?.error || 'Invalid or expired meeting.';
        setValidationError(msg);
        setIsValidating(false);
      }
    };

    if (meetingId) {
      verifyRoom();
    }
  }, [meetingId]);

  // Handle meeting-ended or peer events from socket
  useEffect(() => {
    if (!socket) return;

    const handleMeetingEnded = () => {
      showToast('The host has ended this meeting.');
      handleExitCall();
    };

    const handleUserJoined = (participant) => {
      showToast(`${participant.name} joined the meeting`);
      if (document.hidden && window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification({
          title: 'Participant Joined',
          body: `${participant.name} has joined the meeting`,
        });
      }
    };

    const handleUserLeft = (data) => {
      showToast(`${data.name || 'A participant'} left the meeting`);
    };

    const handleReceiveMessage = (msg) => {
      if (activePanel !== 'chat') {
        setUnreadCount((prev) => prev + 1);
      }
      if (document.hidden && window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification({
          title: `New message from ${msg?.senderName || 'Participant'}`,
          body: msg?.message || 'New message received in meeting chat',
        });
      }
    };

    const handleWaitingRoomUpdate = (queue) => {
      setWaitingQueue(queue || []);
      if (queue && queue.length > 0 && isHost) {
        showToast(`${queue[queue.length - 1].name} is waiting to join the meeting`);
      }
    };

    const handleWaitingRoomStatus = (data) => {
      if (data.status === 'admitted') {
        setIsWaitingForHost(false);
        showToast('You have been admitted by the host!');
      } else if (data.status === 'rejected') {
        showToast('The host declined your entry request.');
        navigate('/dashboard');
      }
    };

    socket.on('meeting-ended', handleMeetingEnded);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('waiting-room-update', handleWaitingRoomUpdate);
    socket.on('waiting-room-status', handleWaitingRoomStatus);

    return () => {
      socket.off('meeting-ended', handleMeetingEnded);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('waiting-room-update', handleWaitingRoomUpdate);
      socket.off('waiting-room-status', handleWaitingRoomStatus);
    };
  }, [socket, activePanel, isHost, navigate]);

  // Reset unread count when chat panel opens
  useEffect(() => {
    if (activePanel === 'chat') {
      setUnreadCount(0);
    }
  }, [activePanel]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isInLobby || isMeetingEnded) return;

      // Ignore shortcut if user is typing in an input or textarea
      const targetTag = e.target.tagName?.toUpperCase();
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      const key = e.key?.toLowerCase();

      if (key === 'm') {
        e.preventDefault();
        toggleAudio();
      } else if (key === 'c') {
        e.preventDefault();
        toggleVideo();
      } else if (key === 's') {
        e.preventDefault();
        toggleScreenShare();
      } else if (key === 'h') {
        e.preventDefault();
        toggleRaiseHand();
      } else if (key === 'escape') {
        setActivePanel(null);
        setIsSettingsOpen(false);
        setIsDiagnosticsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInLobby, isMeetingEnded, toggleAudio, toggleVideo, toggleScreenShare, toggleRaiseHand]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleJoinFromLobby = async (options) => {
    setLobbyOptions(options);
    timerStartRef.current = Date.now();
    setIsInLobby(false);

    // If waiting room is active and current user is not host
    if (meetingDetails?.waitingRoom && !isHost) {
      setIsWaitingForHost(true);
      if (socket) {
        socket.emit('waiting-room-join', {
          meetingId,
          user: {
            id: user?.id || user?._id,
            name: user?.name,
            avatar: user?.avatar,
          },
        });
      }
    }

    // Register participation in MongoDB
    try {
      await meetingAPI.joinMeeting(meetingId);
    } catch (err) {
      console.warn('Record join participation notice:', err.message);
    }
  };

  const handleAdmitGuest = (guestId) => {
    if (socket) {
      socket.emit('waiting-room-admit', { meetingId, guestId });
      setWaitingQueue((prev) => prev.filter((g) => g.id !== guestId));
    }
  };

  const handleRejectGuest = (guestId) => {
    if (socket) {
      socket.emit('waiting-room-reject', { meetingId, guestId });
      setWaitingQueue((prev) => prev.filter((g) => g.id !== guestId));
    }
  };

  // Real MediaRecorder Recording Handler
  const handleToggleRecord = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingSeconds(0);
      showToast('Recording finished. Downloading video file...');
    } else {
      try {
        const streamToRecord = localStream;
        if (!streamToRecord || streamToRecord.getTracks().length === 0) {
          showToast('Cannot record: No active local media track.');
          return;
        }

        recordedChunksRef.current = [];
        const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        const selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

        const recorder = new MediaRecorder(streamToRecord, { mimeType: selectedMime });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: selectedMime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `Nexora-Recording-${meetingId}-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingSeconds(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
        showToast('Recording started.');
      } catch (err) {
        console.error('Recording error:', err);
        showToast('Failed to start recording: ' + err.message);
      }
    }
  };

  // Real Snapshot / Screenshot Capture Handler
  const handleTakeSnapshot = () => {
    try {
      const videoEl = document.querySelector('video');
      if (!videoEl || !videoEl.videoWidth) {
        showToast('No active video feed available to snapshot.');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Failed to generate snapshot.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Nexora-Snapshot-${meetingId}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        showToast('Snapshot saved to Downloads.');
      }, 'image/png');
    } catch (err) {
      console.error('Snapshot capture error:', err);
      showToast('Snapshot error: ' + err.message);
    }
  };

  const handleExitCall = useCallback(() => {
    // Compute total duration in HH:MM:SS format
    let elapsedSec = 0;
    if (timerStartRef.current) {
      elapsedSec = Math.floor((Date.now() - timerStartRef.current) / 1000);
      const hours = Math.floor(elapsedSec / 3600);
      const mins = Math.floor((elapsedSec % 3600) / 60);
      const secs = elapsedSec % 60;
      setMeetingDuration(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }

    const totalCount = 1 + Object.keys(remoteStreams).length;
    setFinalParticipantCount(totalCount);

    // Store duration in database if host
    if (isHost && elapsedSec > 0) {
      meetingAPI.endMeeting(meetingId, elapsedSec).catch(() => {});
    }

    leaveMeeting();
    setIsMeetingEnded(true);
  }, [leaveMeeting, remoteStreams, isHost, meetingId]);

  const handleHostEndMeetingForAll = () => {
    let elapsedSec = 0;
    if (timerStartRef.current) {
      elapsedSec = Math.floor((Date.now() - timerStartRef.current) / 1000);
    }
    endMeetingForAll(elapsedSec);
    if (elapsedSec > 0) {
      meetingAPI.endMeeting(meetingId, elapsedSec).catch(() => {});
    }
    handleExitCall();
  };

  const handleRejoin = () => {
    setIsMeetingEnded(false);
    setIsInLobby(true);
  };

  const togglePanel = (panelName) => {
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  // Check if current user is host
  const isHost =
    meetingDetails?.hostId === (user?.id || user?._id) ||
    meetingDetails?.hostId?._id === (user?.id || user?._id);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
        <h2 className="text-base font-semibold">Connecting to room {meetingId}...</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying room security and active credentials</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full glass-panel rounded-3xl p-8 border border-white/10 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Meeting Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6">{validationError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Meeting Ended Screen
  if (isMeetingEnded) {
    return (
      <MeetingEndScreen
        meetingId={meetingId}
        durationFormatted={meetingDuration}
        participantCount={finalParticipantCount}
        onRejoin={handleRejoin}
      />
    );
  }

  // Pre-join Lobby Screen
  if (isInLobby) {
    return (
      <MeetingLobby
        meetingId={meetingId}
        meetingDetails={meetingDetails}
        user={user}
        onJoinMeeting={handleJoinFromLobby}
      />
    );
  }

  // Waiting Room Guest Screen
  if (isWaitingForHost) {
    return (
      <GuestWaitingScreen
        meetingTitle={meetingDetails?.title || 'Team Meeting'}
        onLeave={() => navigate('/dashboard')}
      />
    );
  }

  const participantCount = 1 + Object.keys(remoteStreams).length;

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 relative select-none">
      {/* Real-time Animated Floating Reactions */}
      <ReactionsOverlay reactions={reactions} />

      {/* Host Waiting Room Admission Banner */}
      {isHost && waitingQueue.length > 0 && (
        <div className="p-2 z-50">
          <HostWaitingRoomBanner
            waitingQueue={waitingQueue}
            onAdmit={handleAdmitGuest}
            onReject={handleRejectGuest}
          />
        </div>
      )}

      {/* Live Recording REC Badge */}
      {isRecording && (
        <div className="fixed top-16 right-4 z-40 px-3 py-1.5 rounded-xl bg-rose-500/90 text-white text-xs font-semibold flex items-center space-x-2 backdrop-blur-md shadow-lg shadow-rose-500/30 border border-rose-400/40 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>
            REC {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
            {(recordingSeconds % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-2xl shadow-indigo-600/40 border border-white/20 animate-fadeIn">
          {notification}
        </div>
      )}

      {/* Permission / Media Error Banner */}
      {mediaError && (
        <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-amber-300 text-xs flex items-center justify-between z-40">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{mediaError}</span>
          </div>
        </div>
      )}

      {/* Meeting Locked Banner */}
      {isRoomLocked && (
        <div className="w-full bg-rose-500/20 border-b border-rose-500/30 px-4 py-1.5 text-rose-300 text-[11px] font-semibold flex items-center justify-center space-x-2 z-40">
          <span>🔒 This meeting is locked by the host. New participants cannot join.</span>
        </div>
      )}

      {/* Screen Sharing Active Banner */}
      {isScreenSharing && (
        <div className="w-full bg-cyan-600/20 border-b border-cyan-500/40 px-4 py-2 text-cyan-200 text-xs font-semibold flex items-center justify-between z-40 backdrop-blur-md animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>You are sharing your screen</span>
          </div>
          <button
            onClick={toggleScreenShare}
            className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Stop Sharing
          </button>
        </div>
      )}

      {/* Top Meeting Header */}
      <MeetingHeader meetingId={meetingId} participantCount={participantCount} />

      {/* Main Center Area: Video Grid + Sliding Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid */}
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            remoteUsers={remoteUsers}
            remoteMediaStates={remoteMediaStates}
            localUserName={user?.name || 'You'}
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            isScreenSharing={isScreenSharing}
            isLocalSpeaking={isLocalSpeaking}
            activeSpeakers={activeSpeakers}
            isHandRaised={isHandRaised}
            raisedHands={raisedHands}
          />
        </div>

        {/* Chat Panel */}
        {activePanel === 'chat' && (
          <ChatPanel
            meetingId={meetingId}
            user={user}
            socket={socket}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* File Sharing Vault Panel */}
        {activePanel === 'files' && (
          <FileSharePanel
            meetingId={meetingId}
            user={user}
            socket={socket}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Collaborative Meeting Notes Panel */}
        {activePanel === 'notes' && (
          <MeetingNotesPanel
            meetingId={meetingId}
            user={user}
            socket={socket}
            isHost={isHost}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Live Meeting Polls Panel */}
        {activePanel === 'polls' && (
          <MeetingPollsPanel
            meetingId={meetingId}
            user={user}
            socket={socket}
            isHost={isHost}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Audience Q&A Panel */}
        {activePanel === 'qna' && (
          <MeetingQnAPanel
            meetingId={meetingId}
            user={user}
            socket={socket}
            isHost={isHost}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Participant Roster Panel */}
        {activePanel === 'participants' && (
          <ParticipantList
            user={user}
            remoteUsers={remoteUsers}
            remoteMediaStates={remoteMediaStates}
            raisedHands={raisedHands}
            activeSpeakers={activeSpeakers}
            isLocalSpeaking={isLocalSpeaking}
            connectionQualities={connectionQualities}
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            isScreenSharing={isScreenSharing}
            isHandRaised={isHandRaised}
            isHost={isHost}
            isRoomLocked={isRoomLocked}
            onHostMute={hostMutePeer}
            onHostRemove={hostRemovePeer}
            onHostLockRoom={hostLockRoom}
            onHostEndMeetingForAll={handleHostEndMeetingForAll}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>

      {/* Collaborative Whiteboard Studio */}
      {activePanel === 'whiteboard' && (
        <WhiteboardModal
          meetingId={meetingId}
          socket={socket}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Connection Diagnostics Modal */}
      <ConnectionDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        isConnected={socket?.connected}
      />

      {/* Bottom Floating Controls Dock */}
      <MeetingControls
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isRecording={isRecording}
        unreadCount={unreadCount}
        participantCount={participantCount}
        activePanel={activePanel}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleRaiseHand={toggleRaiseHand}
        onSendReaction={sendReaction}
        onTogglePanel={togglePanel}
        onToggleRecord={handleToggleRecord}
        onTakeSnapshot={handleTakeSnapshot}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLeaveMeeting={handleExitCall}
      />
    </div>
  );
};

export default MeetingRoomPage;
