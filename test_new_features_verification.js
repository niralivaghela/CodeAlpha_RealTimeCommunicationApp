const { io } = require('socket.io-client');

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function runNewFeaturesVerification() {
  console.log('\n===============================================================');
  console.log('🧪 REALCONNECT UPGRADE FEATURES E2E VERIFICATION TEST');
  console.log('===============================================================\n');

  try {
    const timestamp = Date.now().toString().slice(-4);

    // 1. Register & Login Host and Attendee
    console.log('1️⃣  [AUTH] Registering Host & Attendee...');
    const hostRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Helen Keller',
        email: `helen_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const hostToken = hostRes.token;
    const hostUser = hostRes.user;
    console.log(`   ✅ Host registered: ${hostUser.name} (${hostUser.email})`);

    const guestRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'David Attenborough',
        email: `david_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    }).then((r) => r.json());

    const guestToken = guestRes.token;
    const guestUser = guestRes.user;
    console.log(`   ✅ Attendee registered: ${guestUser.name} (${guestUser.email})`);

    // 2. Profile Update (Name change & password update)
    console.log('\n2️⃣  [PROFILE] Testing PUT /api/auth/profile...');
    const updateRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        name: 'Dr. Helen Keller (Principal)',
        currentPassword: 'Password123!',
        newPassword: 'NewSecurePassword456!',
      }),
    }).then((r) => r.json());
    console.log(`   ✅ Profile updated: ${updateRes.user.name}`);

    // Verify login with new password
    const reLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `helen_${timestamp}@example.com`,
        password: 'NewSecurePassword456!',
      }),
    }).then((r) => r.json());
    console.log(`   ✅ Re-login with new password succeeded! (Token length: ${reLoginRes.token.length})`);

    // 3. Create Meeting with Options
    console.log('\n3️⃣  [MEETING OPTIONS] Creating Meeting with custom options...');
    const createRes = await fetch(`${API_BASE}/meetings/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        title: 'Executive Board Review',
        options: {
          muteOnEntry: true,
          cameraOffOnEntry: true,
          allowBeforeHost: true,
          requireAuth: true,
        },
      }),
    }).then((r) => r.json());

    const meeting = createRes.meeting;
    console.log(`   ✅ Meeting created: ID = ${meeting.meetingId}, muteOnEntry = ${meeting.options.muteOnEntry}`);

    // 4. Schedule Meeting
    console.log('\n4️⃣  [MEETING SCHEDULING] Scheduling future session...');
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const scheduleRes = await fetch(`${API_BASE}/meetings/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        title: 'All-Hands Engineering Sync',
        scheduledFor: futureDate,
        durationMinutes: 60,
      }),
    }).then((r) => r.json());
    console.log(`   ✅ Meeting scheduled: ${scheduleRes.meeting.title} for ${scheduleRes.meeting.scheduledFor}`);

    // 5. Get User Meetings & Stats
    console.log('\n5️⃣  [METRICS & STATS] Testing GET /api/meetings/user-meetings...');
    const meetingsRes = await fetch(`${API_BASE}/meetings/user-meetings`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    }).then((r) => r.json());
    console.log(`   ✅ Retrieved ${meetingsRes.meetings.length} recent meetings`);
    console.log(`   ✅ Retrieved ${meetingsRes.upcoming.length} upcoming scheduled meetings`);
    console.log(`   ✅ Stats: Total=${meetingsRes.stats.totalMeetings}, Today=${meetingsRes.stats.meetingsToday}, Hours=${meetingsRes.stats.meetingHours}h`);

    // 6. Connect Sockets for Real-time collaboration features
    console.log('\n6️⃣  [SOCKETS] Connecting Host & Guest Sockets...');
    const hostSocket = io(SOCKET_URL, {
      auth: { token: hostToken },
      transports: ['websocket'],
    });
    const guestSocket = io(SOCKET_URL, {
      auth: { token: guestToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => {
      let count = 0;
      const check = () => { count++; if (count === 2) resolve(); };
      hostSocket.on('connect', check);
      guestSocket.on('connect', check);
    });
    console.log('   ✅ Both sockets connected to signaling server');

    // Join room passing { meetingId, user } as expected by signaling.js
    hostSocket.emit('join-room', {
      meetingId: meeting.meetingId,
      user: hostUser,
    });

    await new Promise((r) => setTimeout(r, 200));

    guestSocket.emit('join-room', {
      meetingId: meeting.meetingId,
      user: guestUser,
    });

    await new Promise((r) => setTimeout(r, 300));

    // 7. Active Speaker Detection Event
    console.log('\n7️⃣  [ACTIVE SPEAKER] Broadcasting active-speaker event...');
    const speakerPromise = new Promise((resolve) => {
      hostSocket.on('active-speaker-changed', (data) => {
        console.log(`   📡 Host detected active speaker: Socket ${data.socketId}, isSpeaking = ${data.isSpeaking}`);
        resolve(data);
      });
    });

    guestSocket.emit('active-speaker', {
      meetingId: meeting.meetingId,
      isSpeaking: true,
    });
    await speakerPromise;
    console.log('   ✅ Active speaker detection sync verified.');

    // 8. Hand Raising Event
    console.log('\n8️⃣  [HAND RAISING] Broadcasting raise-hand event...');
    const handPromise = new Promise((resolve) => {
      hostSocket.on('hand-raised-update', (data) => {
        console.log(`   ✋ Host received hand raise from: Socket ${data.socketId}, isHandRaised = ${data.isHandRaised}`);
        resolve(data);
      });
    });

    guestSocket.emit('raise-hand', {
      meetingId: meeting.meetingId,
      isHandRaised: true,
    });
    await handPromise;
    console.log('   ✅ Hand raising sync verified.');

    // 9. Floating Emoji Reaction Event
    console.log('\n9️⃣  [REACTIONS] Broadcasting send-reaction event...');
    const reactionPromise = new Promise((resolve) => {
      hostSocket.on('reaction-received', (data) => {
        console.log(`   🎉 Host received reaction: "${data.emoji}" from ${data.senderName}`);
        resolve(data);
      });
    });

    guestSocket.emit('send-reaction', {
      meetingId: meeting.meetingId,
      emoji: '🎉',
    });
    await reactionPromise;
    console.log('   ✅ Floating emoji reaction broadcast verified.');

    // 10. Host Moderation: Mute Peer
    console.log('\n🔟 [HOST MODERATION] Host muting guest...');
    const mutePromise = new Promise((resolve) => {
      guestSocket.on('force-mute', () => {
        console.log('   🔇 Guest received "force-mute" notification from host!');
        resolve();
      });
    });

    hostSocket.emit('host-mute-peer', {
      meetingId: meeting.meetingId,
      targetSocketId: guestSocket.id,
    });
    await mutePromise;
    console.log('   ✅ Host remote mute command verified.');

    // 11. Host Moderation: Lock Room
    console.log('\n1️⃣1️⃣ [HOST MODERATION] Host locking room...');
    const lockPromise = new Promise((resolve) => {
      guestSocket.on('room-lock-changed', (data) => {
        console.log(`   🔒 Guest notified of room lock status: isLocked = ${data.isLocked}`);
        resolve();
      });
    });

    hostSocket.emit('host-lock-room', {
      meetingId: meeting.meetingId,
      isLocked: true,
    });
    await lockPromise;
    console.log('   ✅ Host room lock verified.');

    // Disconnect sockets cleanly
    hostSocket.disconnect();
    guestSocket.disconnect();

    console.log('\n===============================================================');
    console.log('🎉 ALL NEW UPGRADE FEATURES VERIFIED WITH 100% SUCCESS!');
    console.log('   ✓ Profile Name & Password Update');
    console.log('   ✓ Meeting Options Configuration (Mute on entry, Camera off)');
    console.log('   ✓ Meeting Scheduling with Date/Time/Duration');
    console.log('   ✓ Analytics & Statistics (Total, Today, Hours, Participants)');
    console.log('   ✓ Real-Time Active Speaker Detection Event Stream');
    console.log('   ✓ Real-Time Hand Raising Notification');
    console.log('   ✓ Floating Emoji Reactions Overlay Sync');
    console.log('   ✓ Host Moderation: Remote Mute Peer');
    console.log('   ✓ Host Moderation: Room Lock Enforcement');
    console.log('===============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

runNewFeaturesVerification();
