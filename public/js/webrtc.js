/**
 * NovaTalk Production WebRTC Engine
 * Real Multi-User P2P Video/Audio Mesh, Screen Sharing, & MediaRecorder
 */

const AppWebRTC = {
  localStream: null,
  screenStream: null,
  isScreenSharing: false,
  peers: {}, // socketId -> { connection, username, iceQueue: [], isRemoteSet: false }
  earlyIceCandidates: {}, // socketId -> [candidates]
  socket: null,
  roomId: null,
  currentUsername: 'Guest',
  currentUserId: null,
  isAudioMuted: false,
  isVideoMuted: false,
  isHandRaised: false,
  isHost: false,
  isCoHost: false,
  controlsBound: false,

  // MediaRecorder API Meeting Recording State
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,

  iceServers: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  },

  async init(socketInstance, roomId, username, userId) {
    this.socket = socketInstance;
    this.roomId = roomId;
    this.currentUsername = username || 'Guest';
    this.currentUserId = userId || (window.AppAuth && window.AppAuth.currentUser && window.AppAuth.currentUser.id);
    this.earlyIceCandidates = {};

    // Clear any previous peer connections if rejoining
    this.cleanupPeers();

    // Acquire Real Camera and Microphone
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      }
      this.addLocalVideoTile();
    } catch (err) {
      console.warn('Microphone/Camera permission prompt info:', err.message);
      try {
        // Try audio-only or low res fallback
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.addLocalVideoTile();
      } catch (e2) {
        this.localStream = new MediaStream();
        this.addLocalVideoTile();
      }
    }

    this.bindSocketEvents();
    if (!this.controlsBound) {
      this.bindControls();
      this.bindShortcuts();
      this.controlsBound = true;
    }
    this.setupAudioAnalyser();

    // Explicitly join the meeting room via Socket.IO
    if (this.socket && this.roomId) {
      this.socket.emit('join-room', {
        roomId: this.roomId,
        username: this.currentUsername,
        userId: this.currentUserId
      });
    }
  },

  cleanupPeers() {
    Object.values(this.peers).forEach((p) => {
      if (p.connection) {
        try { p.connection.close(); } catch (e) {}
      }
    });
    this.peers = {};
    this.earlyIceCandidates = {};
  },

  addLocalVideoTile() {
    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) return;

    // Remove any static demo tiles if still present
    const staticTiles = videoGrid.querySelectorAll('.stage-video-tile:not(#local-video-tile):not([id^="peer-tile-"])');
    staticTiles.forEach((t) => t.remove());

    let localTile = document.getElementById('local-video-tile');
    if (!localTile) {
      localTile = document.createElement('div');
      localTile.id = 'local-video-tile';
      localTile.className = 'stage-video-tile video-tile local-tile';

      const video = document.createElement('video');
      video.id = 'full-stage-local-video';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      if (this.localStream) video.srcObject = this.localStream;

      const label = document.createElement('div');
      label.className = 'stage-tile-tag';
      label.id = 'local-tile-label';
      label.textContent = `${this.currentUsername} (You)`;

      const handBadge = document.createElement('div');
      handBadge.className = 'hand-badge';
      handBadge.id = 'local-hand-badge';
      handBadge.style.display = 'none';
      handBadge.style.position = 'absolute';
      handBadge.style.top = '12px';
      handBadge.style.right = '12px';
      handBadge.style.fontSize = '20px';
      handBadge.textContent = '✋';

      localTile.appendChild(video);
      localTile.appendChild(label);
      localTile.appendChild(handBadge);
      videoGrid.appendChild(localTile);
    } else {
      const video = localTile.querySelector('video');
      if (video && this.localStream) video.srcObject = this.localStream;
      const label = localTile.querySelector('.stage-tile-tag');
      if (label) label.textContent = `${this.currentUsername} (You)`;
    }

    // Also update PiP local video
    const pipVideo = document.getElementById('pip-local-video');
    const pipFallback = document.getElementById('pip-local-fallback');
    if (pipVideo && this.localStream) {
      pipVideo.srcObject = this.localStream;
      pipVideo.style.display = 'block';
      if (pipFallback) pipFallback.style.display = 'none';
    }
  },

  bindSocketEvents() {
    if (!this.socket) return;

    // Room users list received on join
    this.socket.off('room-users');
    this.socket.on('room-users', (users) => {
      const meObj = users.find((u) => u.socketId === this.socket.id);
      if (meObj) {
        this.isHost = meObj.isHost;
        this.isCoHost = meObj.isCoHost;
      }

      // Existing participants initiate connection with new peers
      users.forEach((user) => {
        if (user.socketId !== this.socket.id) {
          this.createPeerConnection(user.socketId, user.username, true);
        }
      });

      this.updateParticipantsList(users);
    });

    // New user joined room
    this.socket.off('user-connected');
    this.socket.on('user-connected', (user) => {
      if (user.socketId !== this.socket.id) {
        this.createPeerConnection(user.socketId, user.username, false);
      }
    });

    // Receiving offer from peer
    this.socket.off('receiving-signal');
    this.socket.on('receiving-signal', async ({ signal, callerId, username }) => {
      let peerObj = this.peers[callerId];
      if (!peerObj) {
        peerObj = this.createPeerConnection(callerId, username, false);
      }

      try {
        await peerObj.connection.setRemoteDescription(new RTCSessionDescription(signal));
        peerObj.isRemoteSet = true;

        // Process any queued ICE candidates
        while (peerObj.iceQueue.length > 0) {
          const cand = peerObj.iceQueue.shift();
          await peerObj.connection.addIceCandidate(new RTCIceCandidate(cand));
        }

        const answer = await peerObj.connection.createAnswer();
        await peerObj.connection.setLocalDescription(answer);

        this.socket.emit('returning-signal', { callerId: callerId, signal: answer });
      } catch (err) {
        console.error('WebRTC offer handling error:', err);
      }
    });

    // Receiving answer from peer
    this.socket.off('receiving-returned-signal');
    this.socket.on('receiving-returned-signal', async ({ signal, id }) => {
      const peerObj = this.peers[id];
      if (peerObj) {
        try {
          await peerObj.connection.setRemoteDescription(new RTCSessionDescription(signal));
          peerObj.isRemoteSet = true;

          while (peerObj.iceQueue.length > 0) {
            const cand = peerObj.iceQueue.shift();
            await peerObj.connection.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch (err) {
          console.error('WebRTC remote description error:', err);
        }
      }
    });

    // Receiving ICE candidate
    this.socket.off('ice-candidate');
    this.socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      if (!candidate) return;
      const peerObj = this.peers[senderSocketId];
      if (peerObj) {
        if (peerObj.isRemoteSet) {
          try {
            await peerObj.connection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Add ICE candidate error:', err);
          }
        } else {
          peerObj.iceQueue.push(candidate);
        }
      } else {
        if (!this.earlyIceCandidates[senderSocketId]) {
          this.earlyIceCandidates[senderSocketId] = [];
        }
        this.earlyIceCandidates[senderSocketId].push(candidate);
      }
    });

    // Peer media state changed (mic muted, camera toggled)
    this.socket.off('peer-media-state-changed');
    this.socket.on('peer-media-state-changed', ({ socketId, isAudioMuted, isVideoMuted }) => {
      const tile = document.getElementById(`peer-tile-${socketId}`);
      if (tile) {
        const video = tile.querySelector('video');
        if (video) video.style.opacity = isVideoMuted ? '0.2' : '1';
        let statusTag = tile.querySelector('.peer-media-tag');
        if (!statusTag) {
          statusTag = document.createElement('span');
          statusTag.className = 'peer-media-tag';
          statusTag.style.marginLeft = '8px';
          statusTag.style.fontSize = '12px';
          tile.querySelector('.stage-tile-tag')?.appendChild(statusTag);
        }
        statusTag.textContent = `${isAudioMuted ? '🔇' : '🎙️'} ${isVideoMuted ? '🚫📷' : ''}`;
      }
    });

    // Peer disconnected
    this.socket.off('user-disconnected');
    this.socket.on('user-disconnected', ({ socketId }) => {
      this.removePeer(socketId);
    });

    // Raise hand update
    this.socket.off('hand-raised-update');
    this.socket.on('hand-raised-update', ({ socketId, username, isHandRaised }) => {
      const tile = document.getElementById(socketId === this.socket.id ? 'local-video-tile' : `peer-tile-${socketId}`);
      if (tile) {
        const badge = tile.querySelector('.hand-badge');
        if (badge) badge.style.display = isHandRaised ? 'block' : 'none';
      }
    });

    // Active speaker highlight
    this.socket.off('active-speaker-changed');
    this.socket.on('active-speaker-changed', ({ socketId }) => {
      document.querySelectorAll('.stage-video-tile').forEach((t) => t.classList.remove('speaking'));
      const activeTile = document.getElementById(socketId === this.socket.id ? 'local-video-tile' : `peer-tile-${socketId}`);
      if (activeTile) activeTile.classList.add('speaking');
    });

    // Host Force Mute
    this.socket.off('force-mute');
    this.socket.on('force-mute', () => {
      this.isAudioMuted = true;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      this.updateMicUI();
      alert('The meeting host has muted your microphone.');
    });

    // Host Force Remove
    this.socket.off('force-remove');
    this.socket.on('force-remove', () => {
      alert('You have been removed from the meeting by the host.');
      this.leaveMeeting();
    });
  },

  createPeerConnection(targetSocketId, username, isInitiator) {
    if (this.peers[targetSocketId]) {
      return this.peers[targetSocketId];
    }

    const pc = new RTCPeerConnection(this.iceServers);
    const peerObj = {
      connection: pc,
      username: username || 'Participant',
      iceQueue: [],
      isRemoteSet: false
    };

    // Drain any early ICE candidates received before PC was initialized
    if (this.earlyIceCandidates[targetSocketId]) {
      peerObj.iceQueue.push(...this.earlyIceCandidates[targetSocketId]);
      delete this.earlyIceCandidates[targetSocketId];
    }

    // Attach local media tracks (properly separating audio & video streams)
    const videoTrack = (this.isScreenSharing && this.screenStream && this.screenStream.getVideoTracks()[0])
      ? this.screenStream.getVideoTracks()[0]
      : (this.localStream && this.localStream.getVideoTracks()[0]);
    const audioTrack = this.localStream && this.localStream.getAudioTracks()[0];

    if (videoTrack) {
      pc.addTrack(videoTrack, this.isScreenSharing ? this.screenStream : this.localStream);
    }
    if (audioTrack) {
      pc.addTrack(audioTrack, this.localStream);
    }

    // Forward ICE candidates to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote media track
    pc.ontrack = (event) => {
      this.addRemoteVideoTile(targetSocketId, username, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(targetSocketId);
      }
    };

    this.peers[targetSocketId] = peerObj;

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          this.socket.emit('sending-signal', {
            userToSignal: targetSocketId,
            callerId: this.socket.id,
            signal: pc.localDescription,
            username: this.currentUsername
          });
        })
        .catch((err) => console.error('Create offer error:', err));
    }

    return peerObj;
  },

  addRemoteVideoTile(socketId, username, stream) {
    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) return;

    let tile = document.getElementById(`peer-tile-${socketId}`);
    if (!tile) {
      tile = document.createElement('div');
      tile.id = `peer-tile-${socketId}`;
      tile.className = 'stage-video-tile video-tile remote-tile';

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = false; // ensure remote audio is heard
      video.srcObject = stream;
      video.play().catch(e => console.log('Remote play policy note:', e.message));

      const label = document.createElement('div');
      label.className = 'stage-tile-tag';
      label.textContent = username || 'Remote Participant';

      const handBadge = document.createElement('div');
      handBadge.className = 'hand-badge';
      handBadge.style.display = 'none';
      handBadge.style.position = 'absolute';
      handBadge.style.top = '12px';
      handBadge.style.right = '12px';
      handBadge.style.fontSize = '20px';
      handBadge.textContent = '✋';

      tile.appendChild(video);
      tile.appendChild(label);
      tile.appendChild(handBadge);
      videoGrid.appendChild(tile);
    } else {
      const video = tile.querySelector('video');
      if (video) {
        video.srcObject = stream;
        video.play().catch(e => console.log('Remote update play note:', e.message));
      }
      const label = tile.querySelector('.stage-tile-tag');
      if (label && username) label.textContent = username;
    }

    // Also update PiP remote video if single peer
    const pipRemoteVideo = document.getElementById('pip-remote-video');
    const pipRemoteImg = document.getElementById('pip-remote-img');
    if (pipRemoteVideo) {
      pipRemoteVideo.srcObject = stream;
      pipRemoteVideo.style.display = 'block';
      if (pipRemoteImg) pipRemoteImg.style.display = 'none';
    }
  },

  removePeer(socketId) {
    if (this.peers[socketId]) {
      try { this.peers[socketId].connection.close(); } catch (e) {}
      delete this.peers[socketId];
    }
    const tile = document.getElementById(`peer-tile-${socketId}`);
    if (tile) tile.remove();
  },

  // Microphone Audio Toggle
  toggleAudio() {
    this.isAudioMuted = !this.isAudioMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.isAudioMuted));
    }
    this.updateMicUI();
    if (this.socket) {
      this.socket.emit('peer-media-state', {
        isAudioMuted: this.isAudioMuted,
        isVideoMuted: this.isVideoMuted
      });
    }
    return this.isAudioMuted;
  },

  updateMicUI() {
    const dockMic = document.getElementById('btn-dock-mic');
    const pipMic = document.getElementById('btn-pip-mic');
    const isMuted = this.isAudioMuted;

    if (dockMic) {
      dockMic.style.background = isMuted ? '#ef4444' : 'rgba(255,255,255,0.12)';
      dockMic.title = isMuted ? 'Unmute Microphone' : 'Mute Microphone';
    }
    if (pipMic) {
      pipMic.classList.toggle('muted', isMuted);
    }
  },

  // Camera Video Toggle
  toggleVideo() {
    this.isVideoMuted = !this.isVideoMuted;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = !this.isVideoMuted));
    }
    this.updateCamUI();
    if (this.socket) {
      this.socket.emit('peer-media-state', {
        isAudioMuted: this.isAudioMuted,
        isVideoMuted: this.isVideoMuted
      });
    }
    return this.isVideoMuted;
  },

  updateCamUI() {
    const dockCam = document.getElementById('btn-dock-cam');
    const pipCam = document.getElementById('btn-pip-cam');
    const pipVideo = document.getElementById('pip-local-video');
    const pipFallback = document.getElementById('pip-local-fallback');
    const isOff = this.isVideoMuted;

    if (dockCam) {
      dockCam.style.background = isOff ? '#ef4444' : 'rgba(255,255,255,0.12)';
      dockCam.title = isOff ? 'Turn Camera On' : 'Turn Camera Off';
    }
    if (pipCam) pipCam.classList.toggle('muted', isOff);

    if (pipVideo && pipFallback) {
      pipVideo.style.display = isOff ? 'none' : 'block';
      pipFallback.style.display = isOff ? 'block' : 'none';
    }
  },

  // Screen Sharing with Track Replacement
  async startScreenShare() {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      this.isScreenSharing = true;

      // Update local stage view
      const localVideo = document.getElementById('full-stage-local-video');
      if (localVideo) localVideo.srcObject = this.screenStream;

      // Replace track on all connected peers
      Object.values(this.peers).forEach((peerObj) => {
        if (peerObj.connection) {
          const senders = peerObj.connection.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }
      });

      screenTrack.onended = () => this.stopScreenShare();

      const screenBtn = document.getElementById('btn-dock-screen');
      if (screenBtn) screenBtn.style.background = '#6366f1';
    } catch (err) {
      console.warn('Screen sharing cancelled:', err);
    }
  },

  stopScreenShare() {
    if (!this.isScreenSharing) return;
    this.isScreenSharing = false;

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    const cameraTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;
    const localVideo = document.getElementById('full-stage-local-video');
    if (localVideo && this.localStream) localVideo.srcObject = this.localStream;

    if (cameraTrack) {
      Object.values(this.peers).forEach((peerObj) => {
        if (peerObj.connection) {
          const senders = peerObj.connection.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(cameraTrack);
          }
        }
      });
    }

    const screenBtn = document.getElementById('btn-dock-screen');
    if (screenBtn) screenBtn.style.background = 'rgba(255,255,255,0.12)';
  },

  // MediaRecorder API Recording
  startRecording() {
    try {
      this.recordedChunks = [];
      const streamToRecord = this.isScreenSharing ? this.screenStream : this.localStream;
      if (!streamToRecord) {
        alert('No active media stream found to record.');
        return;
      }

      this.mediaRecorder = new MediaRecorder(streamToRecord, { mimeType: 'video/webm' });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novatalk-meeting-${this.roomId || Date.now()}.webm`;
        a.click();
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;

      const recordBtn = document.getElementById('btn-dock-record');
      if (recordBtn) recordBtn.style.background = '#ef4444';
      alert('🔴 Meeting recording started! Click Record again to stop and download.');
    } catch (err) {
      alert('Recording failed: ' + err.message);
    }
  },

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;

      const recordBtn = document.getElementById('btn-dock-record');
      if (recordBtn) recordBtn.style.background = 'rgba(255,255,255,0.12)';
      alert('💾 Meeting recording stopped and saved as .webm!');
    }
  },

  leaveMeeting() {
    if (this.isRecording) this.stopRecording();
    if (this.isScreenSharing) this.stopScreenShare();

    this.cleanupPeers();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    const videoGrid = document.getElementById('video-grid');
    if (videoGrid) videoGrid.innerHTML = '';

    const modal = document.getElementById('meeting-modal');
    if (modal) modal.style.display = 'none';

    if (this.socket && this.roomId) {
      this.socket.emit('leave-meeting', { roomId: this.roomId });
    }
  },

  bindControls() {
    // Dock Mic
    document.getElementById('btn-dock-mic')?.addEventListener('click', () => this.toggleAudio());
    document.getElementById('btn-pip-mic')?.addEventListener('click', () => this.toggleAudio());

    // Dock Cam
    document.getElementById('btn-dock-cam')?.addEventListener('click', () => this.toggleVideo());
    document.getElementById('btn-pip-cam')?.addEventListener('click', () => this.toggleVideo());

    // Dock Screen
    document.getElementById('btn-dock-screen')?.addEventListener('click', () => {
      if (!this.isScreenSharing) this.startScreenShare();
      else this.stopScreenShare();
    });

    // Dock Record
    document.getElementById('btn-dock-record')?.addEventListener('click', () => {
      if (!this.isRecording) this.startRecording();
      else this.stopRecording();
    });

    // Dock Leave / End
    document.getElementById('btn-dock-end')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to leave the meeting?')) {
        this.leaveMeeting();
      }
    });
    document.getElementById('btn-meeting-close')?.addEventListener('click', () => {
      if (confirm('Leave meeting?')) {
        this.leaveMeeting();
      }
    });

    // Raise Hand
    document.getElementById('btn-dock-hand')?.addEventListener('click', () => {
      this.isHandRaised = !this.isHandRaised;
      if (this.socket) {
        this.socket.emit('raise-hand', { isHandRaised: this.isHandRaised });
      }
      const handBadge = document.getElementById('local-hand-badge');
      if (handBadge) handBadge.style.display = this.isHandRaised ? 'block' : 'none';
    });
  },

  bindShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (this.isAudioMuted && this.localStream) {
          this.localStream.getAudioTracks().forEach((t) => (t.enabled = true));
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (this.isAudioMuted && this.localStream) {
          this.localStream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      }
    });
  },

  setupAudioAnalyser() {
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) return;

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(this.localStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;

        if (avg > 35 && !this.isAudioMuted && this.socket) {
          this.socket.emit('active-speaker');
        }
      }, 1000);
    } catch (e) {}
  },

  updateParticipantsList(users) {
    const list = document.getElementById('participants-list');
    const countTag = document.getElementById('participant-count');
    if (countTag) countTag.textContent = users.length;
    if (!list) return;

    list.innerHTML = '';
    users.forEach((u) => {
      const item = document.createElement('div');
      item.className = 'participant-item';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.padding = '6px 0';
      item.style.fontSize = '12px';

      item.innerHTML = `
        <span>${u.username} ${u.socketId === this.socket.id ? '(You)' : ''}</span>
        <span>${u.isHost ? '👑 Host' : 'Participant'}</span>
      `;
      list.appendChild(item);
    });
  }
};

window.AppWebRTC = AppWebRTC;
