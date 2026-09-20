import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (meetingId, user, socket, initialOptions = {}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { [socketId]: MediaStream }
  const [remoteUsers, setRemoteUsers] = useState({}); // { [socketId]: { name, userId, isHost } }
  const [remoteMediaStates, setRemoteMediaStates] = useState({}); // { [socketId]: { isMuted, isCameraOff, isScreenSharing } }
  const [isAudioMuted, setIsAudioMuted] = useState(initialOptions.isMuted || false);
  const [isVideoMuted, setIsVideoMuted] = useState(initialOptions.isCameraOff || false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState({}); // { [socketId]: boolean }
  const [activeSpeakers, setActiveSpeakers] = useState({}); // { [socketId]: boolean }
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [reactions, setReactions] = useState([]); // [ { id, emoji, senderName, socketId, timestamp } ]
  const [mediaError, setMediaError] = useState(null);
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [connectionQualities, setConnectionQualities] = useState({}); // { [socketId]: 'Excellent' | 'Good' | 'Poor' }

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peersRef = useRef({}); // { [socketId]: RTCPeerConnection }
  const iceCandidateQueues = useRef({}); // { [socketId]: RTCIceCandidate[] }

  // Audio analysis for active speaker detection
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // 1. Acquire Local Media Stream
  useEffect(() => {
    let active = true;

    const startMedia = async () => {
      try {
        const videoConstraints = initialOptions.selectedVideoDevice
          ? { deviceId: { exact: initialOptions.selectedVideoDevice } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { max: 30 } };

        const audioConstraints = initialOptions.selectedAudioDevice
          ? { deviceId: { exact: initialOptions.selectedAudioDevice } }
          : true;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Apply initial lobby preferences
        if (initialOptions.isCameraOff) {
          stream.getVideoTracks().forEach((t) => (t.enabled = false));
          setIsVideoMuted(true);
        }
        if (initialOptions.isMuted) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
          setIsAudioMuted(true);
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setMediaError(null);

        // Setup real-time audio volume analyzer for active speaker detection
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            src.connect(analyser);
            analyserRef.current = analyser;

            const buffer = new Uint8Array(analyser.frequencyBinCount);
            let lastSpeakingState = false;

            const checkSpeech = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(buffer);
              let sum = 0;
              for (let i = 0; i < buffer.length; i++) sum += buffer[i];
              const avg = sum / buffer.length;
              const isSpeakingNow = avg > 14 && stream.getAudioTracks().some((t) => t.enabled);

              if (isSpeakingNow !== lastSpeakingState) {
                lastSpeakingState = isSpeakingNow;
                setIsLocalSpeaking(isSpeakingNow);
                if (socket && meetingId) {
                  socket.emit('active-speaker', { meetingId, isSpeaking: isSpeakingNow });
                }
              }
              animFrameRef.current = requestAnimationFrame(checkSpeech);
            };
            checkSpeech();
          }
        } catch (e) {
          console.warn('Local audio analyzer error:', e);
        }
      } catch (err) {
        console.warn('Initial camera/mic access failed, attempting audio fallback:', err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (!active) {
            audioStream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setIsVideoMuted(true);
          setMediaError('Camera permission was denied or unavailable. Continuing with audio only.');
        } catch (audioErr) {
          console.warn('Microphone permission also denied:', audioErr);
          const emptyStream = new MediaStream();
          localStreamRef.current = emptyStream;
          setLocalStream(emptyStream);
          setIsAudioMuted(true);
          setIsVideoMuted(true);
          setMediaError('Camera and Microphone access were denied. Please grant permissions in your browser address bar.');
        }
      }
    };

    startMedia();

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [meetingId, socket]);

  // Create Peer Connection Helper
  const createPeerConnection = useCallback((targetSocketId, targetName) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetSocketId] = pc;
    iceCandidateQueues.current[targetSocketId] = [];

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Remote track listener
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${targetSocketId} (${event.track.kind})`);
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      setRemoteStreams((prev) => ({
        ...prev,
        [targetSocketId]: stream,
      }));
    };

    // ICE candidates listener
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  }, [socket]);

  // 2. WebRTC Mesh Signaling and Socket Listeners
  useEffect(() => {
    if (!socket || !meetingId || !user || !localStream) return;

    // Join room with initial state
    socket.emit('join-room', {
      meetingId,
      user: {
        id: user.id || user._id,
        name: user.name,
      },
      initialMediaState: {
        isMuted: isAudioMuted,
        isCameraOff: isVideoMuted,
      },
    });

    const handleAllUsers = (users) => {
      console.log('[WebRTC] Received all-users:', users);
      users.forEach((existingUser) => {
        setRemoteUsers((prev) => ({
          ...prev,
          [existingUser.socketId]: {
            name: existingUser.name,
            userId: existingUser.userId,
            isHost: existingUser.isHost,
          },
        }));

        setRemoteMediaStates((prev) => ({
          ...prev,
          [existingUser.socketId]: {
            isMuted: existingUser.isMuted,
            isCameraOff: existingUser.isCameraOff,
            isScreenSharing: existingUser.isScreenSharing,
          },
        }));

        if (existingUser.isHandRaised) {
          setRaisedHands((prev) => ({ ...prev, [existingUser.socketId]: true }));
        }

        // Create offer to existing peer
        const pc = createPeerConnection(existingUser.socketId, existingUser.name);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('offer', {
              targetSocketId: existingUser.socketId,
              callerSocketId: socket.id,
              sdp: pc.localDescription,
              callerName: user.name,
            });
          })
          .catch((err) => console.error('[WebRTC] Offer error:', err));
      });
    };

    const handleUserJoined = (newUser) => {
      console.log('[WebRTC] User joined:', newUser);
      setRemoteUsers((prev) => ({
        ...prev,
        [newUser.socketId]: {
          name: newUser.name,
          userId: newUser.userId,
          isHost: newUser.isHost,
        },
      }));
      setRemoteMediaStates((prev) => ({
        ...prev,
        [newUser.socketId]: {
          isMuted: newUser.isMuted,
          isCameraOff: newUser.isCameraOff,
          isScreenSharing: newUser.isScreenSharing,
        },
      }));
    };

    const handleOffer = async ({ callerSocketId, sdp, callerName }) => {
      setRemoteUsers((prev) => ({
        ...prev,
        [callerSocketId]: { name: callerName, userId: null },
      }));

      const pc = createPeerConnection(callerSocketId, callerName);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (iceCandidateQueues.current[callerSocketId]) {
          for (const cand of iceCandidateQueues.current[callerSocketId]) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          iceCandidateQueues.current[callerSocketId] = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
          targetSocketId: callerSocketId,
          responderSocketId: socket.id,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error('[WebRTC] Answer creation error:', err);
      }
    };

    const handleAnswer = async ({ responderSocketId, sdp }) => {
      const pc = peersRef.current[responderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          if (iceCandidateQueues.current[responderSocketId]) {
            for (const cand of iceCandidateQueues.current[responderSocketId]) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            iceCandidateQueues.current[responderSocketId] = [];
          }
        } catch (err) {
          console.error('[WebRTC] Remote description error:', err);
        }
      }
    };

    const handleIceCandidate = async ({ senderSocketId, candidate }) => {
      const pc = peersRef.current[senderSocketId];
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Add ICE error:', err);
        }
      } else {
        if (!iceCandidateQueues.current[senderSocketId]) {
          iceCandidateQueues.current[senderSocketId] = [];
        }
        iceCandidateQueues.current[senderSocketId].push(candidate);
      }
    };

    const handleUserLeft = ({ socketId }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].close();
        delete peersRef.current[socketId];
      }
      delete iceCandidateQueues.current[socketId];

      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setRemoteUsers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setRemoteMediaStates((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setRaisedHands((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setActiveSpeakers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const handleMediaToggled = ({ socketId, isMuted, isCameraOff, isScreenSharing }) => {
      setRemoteMediaStates((prev) => ({
        ...prev,
        [socketId]: { isMuted, isCameraOff, isScreenSharing },
      }));
    };

    const handleActiveSpeakerChanged = ({ socketId, isSpeaking }) => {
      setActiveSpeakers((prev) => ({
        ...prev,
        [socketId]: isSpeaking,
      }));
    };

    const handleHandRaised = ({ socketId, isHandRaised: raisedState }) => {
      setRaisedHands((prev) => ({
        ...prev,
        [socketId]: raisedState,
      }));
    };

    const handleReaction = (reaction) => {
      setReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    };

    // Host Moderation Handlers
    const handleForceMute = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        setIsAudioMuted(true);
      }
    };

    const handleLockChanged = ({ isLocked }) => {
      setIsRoomLocked(isLocked);
    };

    socket.on('all-users', handleAllUsers);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);
    socket.on('user-media-toggled', handleMediaToggled);
    socket.on('active-speaker-changed', handleActiveSpeakerChanged);
    socket.on('hand-raised-update', handleHandRaised);
    socket.on('reaction-received', handleReaction);
    socket.on('force-mute', handleForceMute);
    socket.on('room-lock-changed', handleLockChanged);

    return () => {
      socket.off('all-users', handleAllUsers);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
      socket.off('user-media-toggled', handleMediaToggled);
      socket.off('active-speaker-changed', handleActiveSpeakerChanged);
      socket.off('hand-raised-update', handleHandRaised);
      socket.off('reaction-received', handleReaction);
      socket.off('force-mute', handleForceMute);
      socket.off('room-lock-changed', handleLockChanged);

      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      iceCandidateQueues.current = {};
    };
  }, [socket, meetingId, user, localStream, isAudioMuted, isVideoMuted, createPeerConnection]);

  // 3. Audio Toggle
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setIsAudioMuted(!nextState);

        if (socket && meetingId) {
          socket.emit('toggle-media', {
            meetingId,
            isMuted: !nextState,
            isCameraOff: isVideoMuted,
            isScreenSharing,
          });
        }
      }
    }
  }, [socket, meetingId, isVideoMuted, isScreenSharing]);

  // 4. Video Toggle
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setIsVideoMuted(!nextState);

        if (socket && meetingId) {
          socket.emit('toggle-media', {
            meetingId,
            isMuted: isAudioMuted,
            isCameraOff: !nextState,
            isScreenSharing,
          });
        }
      }
    }
  }, [socket, meetingId, isAudioMuted, isScreenSharing]);

  // 5. Screen Share Toggle
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      const cameraTrack = localStreamRef.current ? localStreamRef.current.getVideoTracks()[0] : null;
      if (cameraTrack) {
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(cameraTrack);
        });
      }

      setIsScreenSharing(false);
      if (socket && meetingId) {
        socket.emit('toggle-media', {
          meetingId,
          isMuted: isAudioMuted,
          isCameraOff: isVideoMuted,
          isScreenSharing: false,
        });
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });

        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        setIsScreenSharing(true);
        if (socket && meetingId) {
          socket.emit('toggle-media', {
            meetingId,
            isMuted: isAudioMuted,
            isCameraOff: false,
            isScreenSharing: true,
          });
        }

        screenTrack.onended = () => {
          const cameraTrack = localStreamRef.current ? localStreamRef.current.getVideoTracks()[0] : null;
          if (cameraTrack) {
            Object.values(peersRef.current).forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
              if (sender) sender.replaceTrack(cameraTrack);
            });
          }
          setIsScreenSharing(false);
          if (socket && meetingId) {
            socket.emit('toggle-media', {
              meetingId,
              isMuted: isAudioMuted,
              isCameraOff: isVideoMuted,
              isScreenSharing: false,
            });
          }
        };
      } catch (err) {
        console.warn('Screen share permission denied:', err);
      }
    }
  }, [isScreenSharing, socket, meetingId, isAudioMuted, isVideoMuted]);

  // 6. Raise Hand
  const toggleRaiseHand = useCallback(() => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    if (socket && meetingId) {
      socket.emit('raise-hand', { meetingId, isHandRaised: next });
    }
  }, [isHandRaised, socket, meetingId]);

  // 7. Send Reaction
  const sendReaction = useCallback((emoji) => {
    if (socket && meetingId) {
      socket.emit('send-reaction', { meetingId, emoji });
    }
  }, [socket, meetingId]);

  // 8. Host Moderation Actions
  const hostMutePeer = useCallback((targetSocketId) => {
    if (socket && meetingId) {
      socket.emit('host-mute-peer', { meetingId, targetSocketId });
    }
  }, [socket, meetingId]);

  const hostRemovePeer = useCallback((targetSocketId) => {
    if (socket && meetingId) {
      socket.emit('host-remove-peer', { meetingId, targetSocketId });
    }
  }, [socket, meetingId]);

  const hostLockRoom = useCallback((lockState) => {
    if (socket && meetingId) {
      socket.emit('host-lock-room', { meetingId, isLocked: lockState });
    }
  }, [socket, meetingId]);

  const endMeetingForAll = useCallback((durationSeconds) => {
    if (socket && meetingId) {
      socket.emit('end-meeting-for-all', { meetingId, durationSeconds });
    }
  }, [socket, meetingId]);

  // Real WebRTC Stats Collection for Connection Quality (RTT, packet loss, state)
  useEffect(() => {
    const checkStats = async () => {
      const nextQualities = {};
      const peerEntries = Object.entries(peersRef.current);

      for (const [peerSocketId, pc] of peerEntries) {
        if (!pc || pc.connectionState === 'closed') continue;

        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          nextQualities[peerSocketId] = 'Poor';
          continue;
        }

        try {
          const stats = await pc.getStats();
          let rtt = null;
          let packetsLost = 0;
          let packetsReceived = 0;

          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.nominated)) {
              if (report.currentRoundTripTime !== undefined) {
                rtt = report.currentRoundTripTime;
              }
            }
            if (report.type === 'inbound-rtp') {
              if (report.packetsLost !== undefined) packetsLost += report.packetsLost;
              if (report.packetsReceived !== undefined) packetsReceived += report.packetsReceived;
            }
          });

          const total = packetsLost + packetsReceived;
          const lossRate = total > 0 ? (packetsLost / total) * 100 : 0;

          if (rtt !== null) {
            if (rtt <= 0.12 && lossRate < 2.5) {
              nextQualities[peerSocketId] = 'Excellent';
            } else if (rtt <= 0.28 && lossRate < 6) {
              nextQualities[peerSocketId] = 'Good';
            } else {
              nextQualities[peerSocketId] = 'Poor';
            }
          } else {
            nextQualities[peerSocketId] = pc.connectionState === 'connected' ? 'Good' : 'Poor';
          }
        } catch (e) {
          nextQualities[peerSocketId] = pc.connectionState === 'connected' ? 'Good' : 'Poor';
        }
      }

      setConnectionQualities(nextQualities);
    };

    const interval = setInterval(checkStats, 2500);
    return () => clearInterval(interval);
  }, []);

  const leaveMeeting = useCallback(() => {
    if (socket && meetingId) {
      socket.emit('leave-room', { meetingId });
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    iceCandidateQueues.current = {};
  }, [socket, meetingId]);

  return {
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
  };
};
