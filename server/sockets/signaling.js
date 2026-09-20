const Message = require('../models/Message');
const Meeting = require('../models/Meeting');

// In-memory room state for active conferences
// meetingId -> { hostSocketId, hostUserId, isLocked, participants: Map(socketId -> { socketId, userId, name, isMuted, isCameraOff, isScreenSharing, isHandRaised }), strokes: [] }
const rooms = new Map();

function getOrCreateRoom(meetingId) {
  if (!rooms.has(meetingId)) {
    rooms.set(meetingId, {
      hostSocketId: null,
      hostUserId: null,
      isLocked: false,
      participants: new Map(),
      strokes: [],
    });
  }
  return rooms.get(meetingId);
}

module.exports = (io) => {
  io.on('connection', (socket) => {
    let currentMeetingId = null;
    let currentUser = null;

    // 1. Join Room
    socket.on('join-room', async ({ meetingId, user, initialMediaState }) => {
      if (!meetingId || !user) return;
      const normalizedMeetingId = meetingId.trim().toUpperCase();
      currentMeetingId = normalizedMeetingId;
      currentUser = user;

      const room = getOrCreateRoom(normalizedMeetingId);

      // Check if room is locked by host
      if (room.isLocked && room.hostUserId !== (user.id || user._id)) {
        socket.emit('room-locked', { message: 'This meeting is currently locked by the host.' });
        return;
      }

      // Check DB meeting host to assign host privileges
      try {
        const dbMeeting = await Meeting.findOne({ meetingId: normalizedMeetingId });
        if (dbMeeting) {
          const dbHostId = dbMeeting.hostId ? dbMeeting.hostId.toString() : null;
          const userStrId = (user.id || user._id || '').toString();
          if (dbHostId === userStrId || room.hostSocketId === null) {
            room.hostSocketId = socket.id;
            room.hostUserId = userStrId;
          }

          // Register participant in MongoDB if not already present
          const existingParticipant = dbMeeting.participants.find(
            (p) => p.userId && p.userId.toString() === userStrId
          );
          if (!existingParticipant) {
            dbMeeting.participants.push({
              userId: user.id || user._id,
              name: user.name,
              email: user.email || '',
              joinedAt: new Date(),
            });
            await dbMeeting.save();
          }
        }
      } catch (err) {
        console.warn('DB meeting check error on join-room:', err.message);
      }

      socket.join(normalizedMeetingId);

      const isHost = room.hostSocketId === socket.id;

      const participantInfo = {
        socketId: socket.id,
        userId: user.id || user._id,
        name: user.name,
        isHost,
        isMuted: initialMediaState?.isMuted || false,
        isCameraOff: initialMediaState?.isCameraOff || false,
        isScreenSharing: false,
        isHandRaised: false,
      };

      room.participants.set(socket.id, participantInfo);

      // Send existing participants to the newly joined user
      const existingParticipants = Array.from(room.participants.values()).filter(
        (p) => p.socketId !== socket.id
      );
      socket.emit('all-users', existingParticipants);

      // Send current whiteboard history
      socket.emit('whiteboard-history', room.strokes);

      // Notify all other peers in the room
      socket.to(normalizedMeetingId).emit('user-joined', participantInfo);

      console.log(`[Socket] User ${user.name} (${socket.id}, Host: ${isHost}) joined ${normalizedMeetingId}. Total: ${room.participants.size}`);
    });

    // 2. WebRTC Mesh Signaling: Offer
    socket.on('offer', ({ targetSocketId, callerSocketId, sdp, callerName }) => {
      io.to(targetSocketId).emit('offer', {
        callerSocketId: callerSocketId || socket.id,
        sdp,
        callerName: callerName || (currentUser && currentUser.name) || 'Peer',
      });
    });

    // 3. WebRTC Mesh Signaling: Answer
    socket.on('answer', ({ targetSocketId, responderSocketId, sdp }) => {
      io.to(targetSocketId).emit('answer', {
        responderSocketId: responderSocketId || socket.id,
        sdp,
      });
    });

    // 4. WebRTC Mesh Signaling: ICE Candidate
    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // 5. Media Controls Sync (Mic, Camera, Screen Share)
    socket.on('toggle-media', ({ meetingId, isMuted, isCameraOff, isScreenSharing }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !rooms.has(roomKey)) return;

      const room = rooms.get(roomKey);
      const participant = room.participants.get(socket.id);
      if (participant) {
        if (typeof isMuted === 'boolean') participant.isMuted = isMuted;
        if (typeof isCameraOff === 'boolean') participant.isCameraOff = isCameraOff;
        if (typeof isScreenSharing === 'boolean') participant.isScreenSharing = isScreenSharing;

        socket.to(roomKey).emit('user-media-toggled', {
          socketId: socket.id,
          isMuted: participant.isMuted,
          isCameraOff: participant.isCameraOff,
          isScreenSharing: participant.isScreenSharing,
        });
      }
    });

    // 6. Active Speaker Detection Broadcast
    socket.on('active-speaker', ({ meetingId, isSpeaking }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey) {
        socket.to(roomKey).emit('active-speaker-changed', {
          socketId: socket.id,
          isSpeaking,
        });
      }
    });

    // 7. Raise Hand Synchronization
    socket.on('raise-hand', ({ meetingId, isHandRaised }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !rooms.has(roomKey)) return;

      const room = rooms.get(roomKey);
      const participant = room.participants.get(socket.id);
      if (participant) {
        participant.isHandRaised = isHandRaised;
        io.in(roomKey).emit('hand-raised-update', {
          socketId: socket.id,
          userId: participant.userId,
          name: participant.name,
          isHandRaised,
        });
      }
    });

    // 8. Real-Time Floating Reactions
    socket.on('send-reaction', ({ meetingId, emoji }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !emoji) return;

      const reactionData = {
        id: 'rx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        socketId: socket.id,
        senderName: (currentUser && currentUser.name) || 'Someone',
        emoji,
        timestamp: Date.now(),
      };

      io.in(roomKey).emit('reaction-received', reactionData);
    });

    // 9. Host Moderation Controls
    socket.on('host-mute-peer', ({ meetingId, targetSocketId }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !rooms.has(roomKey)) return;
      const room = rooms.get(roomKey);

      // Verify caller is host
      if (room.hostSocketId === socket.id) {
        io.to(targetSocketId).emit('force-mute');
        console.log(`[Host] Host muted participant ${targetSocketId}`);
      }
    });

    socket.on('host-remove-peer', ({ meetingId, targetSocketId }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !rooms.has(roomKey)) return;
      const room = rooms.get(roomKey);

      if (room.hostSocketId === socket.id) {
        io.to(targetSocketId).emit('force-remove');
        const targetParticipant = room.participants.get(targetSocketId);
        room.participants.delete(targetSocketId);
        io.to(roomKey).emit('user-left', {
          socketId: targetSocketId,
          name: targetParticipant ? targetParticipant.name : 'A participant',
        });
        console.log(`[Host] Host removed participant ${targetSocketId}`);
      }
    });

    socket.on('host-lock-room', ({ meetingId, isLocked }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !rooms.has(roomKey)) return;
      const room = rooms.get(roomKey);

      if (room.hostSocketId === socket.id) {
        room.isLocked = isLocked;
        io.in(roomKey).emit('room-lock-changed', { isLocked });
        console.log(`[Host] Room ${roomKey} lock state changed to: ${isLocked}`);
      }
    });

    // 10. Real-Time Chat
    socket.on('send-message', async ({ meetingId, senderId, senderName, message }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !message || !message.trim()) return;

      const messageData = {
        meetingId: roomKey,
        senderId: senderId || (currentUser && currentUser.id) || socket.id,
        senderName: senderName || (currentUser && currentUser.name) || 'Anonymous',
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      try {
        await Message.create({
          meetingId: messageData.meetingId,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          message: messageData.message,
          timestamp: new Date(messageData.timestamp),
        });
      } catch (err) {
        console.error('Failed to persist message to MongoDB:', err.message);
      }

      io.in(roomKey).emit('receive-message', messageData);
    });

    // 11. File Shared Notification
    socket.on('file-uploaded', ({ meetingId, file }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey && file) {
        socket.to(roomKey).emit('file-shared', file);
      }
    });

    // 12. Collaborative Whiteboard
    socket.on('draw-stroke', ({ meetingId, stroke }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey) return;
      const room = getOrCreateRoom(roomKey);
      room.strokes.push(stroke);
      socket.to(roomKey).emit('stroke-drawn', stroke);
    });

    socket.on('clear-whiteboard', ({ meetingId }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey) return;
      const room = getOrCreateRoom(roomKey);
      room.strokes = [];
      io.in(roomKey).emit('whiteboard-cleared');
    });

    socket.on('undo-whiteboard', ({ meetingId }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey) return;
      const room = getOrCreateRoom(roomKey);
      if (room.strokes.length > 0) {
        room.strokes.pop();
        io.in(roomKey).emit('whiteboard-history', room.strokes);
      }
    });

    // 13. Host Ends Meeting for Everyone
    socket.on('end-meeting-for-all', async ({ meetingId, durationSeconds }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey) return;
      const room = rooms.get(roomKey);
      if (room && room.hostSocketId && room.hostSocketId !== socket.id) {
        console.warn(`[Host] Unauthorized attempt to end meeting ${roomKey} by ${socket.id}`);
        return;
      }

      try {
        const dbMeeting = await Meeting.findOne({ meetingId: roomKey });
        if (dbMeeting) {
          dbMeeting.status = 'ended';
          dbMeeting.endedAt = new Date();
          if (durationSeconds && typeof durationSeconds === 'number' && durationSeconds > 0) {
            dbMeeting.durationSeconds = Math.round(durationSeconds);
          } else if (dbMeeting.startedAt || dbMeeting.createdAt) {
            dbMeeting.durationSeconds = Math.max(
              1,
              Math.round((dbMeeting.endedAt - new Date(dbMeeting.startedAt || dbMeeting.createdAt)) / 1000)
            );
          }
          await dbMeeting.save();
        }
      } catch (err) {
        console.warn('DB end meeting update error:', err.message);
      }

      io.in(roomKey).emit('meeting-ended', { message: 'Meeting ended by the host.' });
      rooms.delete(roomKey);
    });

    // 14. Leave Room explicitly
    socket.on('leave-room', ({ meetingId }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey && rooms.has(roomKey)) {
        const room = rooms.get(roomKey);
        room.participants.delete(socket.id);
        socket.leave(roomKey);
        io.to(roomKey).emit('user-left', {
          socketId: socket.id,
          name: (currentUser && currentUser.name) || 'A participant',
        });
        if (room.participants.size === 0) {
          rooms.delete(roomKey);
        }
      }
    });

    // 15. User Personal Channel & Real Presence
    socket.on('register-user', ({ userId, userName }) => {
      if (!userId) return;
      const userRoom = `user_${userId}`;
      socket.join(userRoom);
      socket.userId = userId;
      socket.userName = userName;
      console.log(`[Socket] User ${userName || userId} registered to personal room ${userRoom}`);
    });

    socket.on('user-presence-change', ({ userId, presence, statusMessage }) => {
      if (!userId) return;
      io.emit('presence-updated', {
        userId,
        presence,
        statusMessage: statusMessage || '',
      });
    });

    // 16. Direct Messaging
    socket.on('dm-send', ({ recipientId, directMessage }) => {
      if (!recipientId || !directMessage) return;
      io.to(`user_${recipientId}`).emit('dm-received', directMessage);
    });

    socket.on('dm-typing', ({ recipientId, senderId, senderName, isTyping }) => {
      if (!recipientId) return;
      io.to(`user_${recipientId}`).emit('dm-typing-indicator', {
        senderId,
        senderName,
        isTyping,
      });
    });

    socket.on('dm-read', ({ senderId, readerId }) => {
      if (!senderId) return;
      io.to(`user_${senderId}`).emit('dm-read-receipt', { readerId });
    });

    // 17. Waiting Room Real-Time Workflow
    socket.on('waiting-room-join', async ({ meetingId, user }) => {
      if (!meetingId || !user) return;
      const roomKey = meetingId.trim().toUpperCase();
      const room = getOrCreateRoom(roomKey);

      const requestItem = {
        socketId: socket.id,
        userId: user.id || user._id,
        name: user.name,
        email: user.email || '',
        requestedAt: new Date().toISOString(),
      };

      if (!room.waitingQueue) room.waitingQueue = new Map();
      room.waitingQueue.set(socket.id, requestItem);

      // Notify host if present
      if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('waiting-room-request', requestItem);
      }
      socket.emit('waiting-room-pending');
      console.log(`[WaitingRoom] User ${user.name} queued for meeting ${roomKey}`);
    });

    socket.on('waiting-room-admit', ({ meetingId, targetSocketId }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !rooms.has(roomKey)) return;
      const room = rooms.get(roomKey);

      if (room.hostSocketId === socket.id && room.waitingQueue) {
        room.waitingQueue.delete(targetSocketId);
        io.to(targetSocketId).emit('waiting-room-admitted');
        console.log(`[WaitingRoom] Host admitted socket ${targetSocketId} into ${roomKey}`);
      }
    });

    socket.on('waiting-room-reject', ({ meetingId, targetSocketId }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (!roomKey || !rooms.has(roomKey)) return;
      const room = rooms.get(roomKey);

      if (room.hostSocketId === socket.id && room.waitingQueue) {
        room.waitingQueue.delete(targetSocketId);
        io.to(targetSocketId).emit('waiting-room-rejected', { message: 'The host declined your entry request.' });
        console.log(`[WaitingRoom] Host rejected socket ${targetSocketId} for ${roomKey}`);
      }
    });

    // 18. Collaborative Notes, Polls & Q&A
    socket.on('meeting-notes-update', ({ meetingId, notes }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey && notes) {
        socket.to(roomKey).emit('meeting-notes-changed', notes);
      }
    });

    socket.on('meeting-poll-create', ({ meetingId, poll }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey && poll) {
        io.in(roomKey).emit('meeting-poll-created', poll);
      }
    });

    socket.on('meeting-poll-vote', ({ meetingId, poll }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey && poll) {
        io.in(roomKey).emit('meeting-poll-updated', poll);
      }
    });

    socket.on('meeting-qna-create', ({ meetingId, question }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey && question) {
        io.in(roomKey).emit('meeting-qna-created', question);
      }
    });

    socket.on('meeting-qna-update', ({ meetingId, question }) => {
      const roomKey = meetingId ? meetingId.trim().toUpperCase() : currentMeetingId;
      if (roomKey && question) {
        io.in(roomKey).emit('meeting-qna-updated', question);
      }
    });

    // 19. Disconnect
    socket.on('disconnect', () => {
      if (currentMeetingId && rooms.has(currentMeetingId)) {
        const room = rooms.get(currentMeetingId);
        room.participants.delete(socket.id);
        if (room.waitingQueue) room.waitingQueue.delete(socket.id);
        io.to(currentMeetingId).emit('user-left', {
          socketId: socket.id,
          name: (currentUser && currentUser.name) || 'A participant',
        });
        if (room.participants.size === 0) {
          rooms.delete(currentMeetingId);
        }
        console.log(`[Socket] Disconnected ${socket.id} from ${currentMeetingId}. Remaining: ${room.participants ? room.participants.size : 0}`);
      }

      if (socket.userId) {
        io.emit('presence-updated', {
          userId: socket.userId,
          presence: 'offline',
        });
      }
    });
  });
};
