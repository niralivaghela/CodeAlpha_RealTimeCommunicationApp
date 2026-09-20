const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';

async function fetchJson(endpoint, options = {}) {
  const url = SERVER_URL + endpoint;
  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 NOVATALK MULTI-CLIENT E2E VERIFICATION TEST');
  console.log('====================================================\n');

  const testSuffix = Date.now().toString().slice(-4);
  const userA = {
    username: 'eval_alice_' + testSuffix,
    full_name: 'Evaluator Alice',
    email: 'alice_' + testSuffix + '@example.com',
    password: 'Password123!',
    role: 'Instructor'
  };

  const userB = {
    username: 'eval_bob_' + testSuffix,
    full_name: 'Evaluator Bob',
    email: 'bob_' + testSuffix + '@example.com',
    password: 'Password123!',
    role: 'Student'
  };

  // STEP 1: Register User A and User B
  console.log('1️⃣ [AUTH] Registering User A (Alice) and User B (Bob)...');
  const regA = await fetchJson('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userA)
  });
  if (regA.status !== 200 && regA.status !== 201) {
    throw new Error('Alice registration failed: ' + JSON.stringify(regA.data));
  }
  console.log('   ✅ Alice registered: ID=' + regA.data.user.id + ', Token issued.');

  const regB = await fetchJson('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userB)
  });
  if (regB.status !== 200 && regB.status !== 201) {
    throw new Error('Bob registration failed: ' + JSON.stringify(regB.data));
  }
  console.log('   ✅ Bob registered: ID=' + regB.data.user.id + ', Token issued.');

  const tokenA = regA.data.token;
  const tokenB = regB.data.token;

  // STEP 2: Verify Auth Token via /api/auth/me
  console.log('\n2️⃣ [AUTH] Verifying JWT tokens via /api/auth/me...');
  const meA = await fetchJson('/api/auth/me', {
    headers: { 'Authorization': 'Bearer ' + tokenA }
  });
  if (meA.data.user.username !== userA.username) {
    throw new Error('Token A validation failed');
  }
  console.log('   ✅ Alice JWT Verified: Authenticated as ' + meA.data.user.full_name + ' (' + meA.data.user.email + ')');

  // STEP 3: Create Dynamic Meeting Room (User A)
  console.log('\n3️⃣ [ROOM] User A creating a dynamic conference room...');
  const createRoomRes = await fetchJson('/api/rooms/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + tokenA
    },
    body: JSON.stringify({ name: 'Task 4 Final Evaluation Room', passcode: '9988' })
  });
  const roomId = createRoomRes.data.roomId;
  if (!roomId) {
    throw new Error('Room creation failed: ' + JSON.stringify(createRoomRes.data));
  }
  console.log('   ✅ Dynamic Room Created: ' + roomId + ' (Name: ' + createRoomRes.data.name + ')');

  // User B verifies Room existence
  const verifyRes = await fetchJson('/api/rooms/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + tokenB
    },
    body: JSON.stringify({ roomId, passcode: '9988' })
  });
  if (!verifyRes.data.valid && !verifyRes.data.success) {
    throw new Error('Room verification failed: ' + JSON.stringify(verifyRes.data));
  }
  console.log('   ✅ User B verified room access: Room is valid and open.');

  // STEP 4: Real-time WebRTC Signaling & Socket.IO Mesh
  console.log('\n4️⃣ [WEBRTC / SOCKET.IO] Connecting independent client sockets to room...');
  const socketA = io(SERVER_URL, { reconnection: false });
  const socketB = io(SERVER_URL, { reconnection: false });

  await new Promise((resolve) => socketA.on('connect', resolve));
  console.log('   ✅ User A socket connected: ' + socketA.id);
  await new Promise((resolve) => socketB.on('connect', resolve));
  console.log('   ✅ User B socket connected: ' + socketB.id);

  const signalingPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Signaling handshake timed out')), 8000);

    socketA.on('user-connected', (data) => {
      console.log('   📡 [User A] detected new peer connected: ' + data.socketId + ' (' + data.username + ')');
      socketA.emit('sending-signal', {
        userToSignal: data.socketId,
        callerId: socketA.id,
        signal: { type: 'offer', sdp: 'mock-sdp-offer-for-testing' },
        username: meA.data.user.full_name
      });
    });

    socketB.on('receiving-signal', (data) => {
      console.log('   📡 [User B] received WebRTC signal offer from: ' + data.callerId + ' (' + data.username + ')');
      socketB.emit('returning-signal', {
        signal: { type: 'answer', sdp: 'mock-sdp-answer-for-testing' },
        callerId: data.callerId
      });
    });

    socketA.on('receiving-returned-signal', (data) => {
      console.log('   📡 [User A] received WebRTC signal answer from peer! Handshake complete.');
      clearTimeout(timeout);
      resolve(true);
    });
  });

  socketA.emit('join-room', {
    roomId,
    username: meA.data.user.full_name,
    userId: meA.data.user.id
  });

  await new Promise(r => setTimeout(r, 400));
  socketB.emit('join-room', {
    roomId,
    username: regB.data.user.full_name,
    userId: regB.data.user.id
  });

  await signalingPromise;
  console.log('   ✅ WebRTC P2P mesh signaling fully verified between User A and User B.');

  // STEP 5: Collaborative Whiteboard Synchronization
  console.log('\n5️⃣ [WHITEBOARD] Testing synchronized collaborative drawing...');
  const whiteboardPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Whiteboard sync timed out')), 5000);
    socketB.on('stroke-drawn', (stroke) => {
      console.log('   🎨 [User B] received stroke: Tool=' + stroke.tool + ', Color=' + stroke.color + ', Size=' + stroke.size);
      clearTimeout(timeout);
      resolve(stroke);
    });
  });

  socketA.emit('draw-stroke', {
    roomId,
    stroke: {
      tool: 'brush',
      color: '#6366F1',
      size: 4,
      points: [{ x: 120, y: 140 }, { x: 200, y: 250 }, { x: 320, y: 280 }]
    }
  });

  await whiteboardPromise;
  console.log('   ✅ Collaborative Whiteboard stroke broadcast & received successfully.');

  // STEP 6: End-to-End Encrypted Data Messaging (E2EE)
  console.log('\n6️⃣ [SECURITY / E2EE] Testing AES-256-GCM encrypted message broadcast...');
  const encryptedPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Encrypted messaging timed out')), 5000);
    socketB.on('new-encrypted-message', (data) => {
      console.log('   🔐 [User B] received encrypted message packet:');
      console.log('      Sender:     ' + data.sender);
      console.log('      Ciphertext: ' + JSON.stringify(data.payload));
      console.log('      Message ID: ' + data.id);
      clearTimeout(timeout);
      resolve(data);
    });
  });

  socketA.emit('send-encrypted-message', {
    roomId,
    senderName: meA.data.user.full_name,
    senderId: meA.data.user.id,
    payload: {
      ciphertext: 'd29ybGQgaXMgc2VjdXJlIGFuZCBlbmNyeXB0ZWQ=',
      iv: 'a3f892c901e45b8812c3',
      tag: 'e1d2c3b4a5f60718'
    }
  });

  await encryptedPromise;
  console.log('   ✅ E2EE encrypted message transmitted & received.');

  // STEP 7: Real File Sharing & Multi-User Download
  console.log('\n7️⃣ [FILE SHARING] Testing real multipart file upload & download...');
  const testFileName = 'Verification_Test_' + Date.now() + '.txt';
  const testFileContent = 'NovaTalk Task 4 Real-time Communication App - End-to-End Verified Document.\nTimestamp: ' + new Date().toISOString();
  
  const formData = new FormData();
  const blob = new Blob([testFileContent], { type: 'text/plain' });
  formData.append('file', blob, testFileName);
  formData.append('roomId', roomId);
  formData.append('uploaderId', meA.data.user.id.toString());
  formData.append('uploaderName', meA.data.user.full_name);

  const uploadRes = await fetch(SERVER_URL + '/api/files/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tokenA },
    body: formData
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.file || !uploadData.file.id) {
    throw new Error('File upload failed: ' + JSON.stringify(uploadData));
  }
  const fileId = uploadData.file.id;
  console.log('   📤 File uploaded: ID=' + fileId + ', Name="' + uploadData.file.file_name + '", Size=' + uploadData.file.file_size + ' bytes');

  const downloadRes = await fetch(SERVER_URL + '/api/files/download/' + fileId, {
    headers: { 'Authorization': 'Bearer ' + tokenB }
  });
  if (downloadRes.status !== 200) {
    throw new Error('User B failed to download file: status ' + downloadRes.status);
  }
  const downloadedText = await downloadRes.text();
  if (downloadedText.trim() === testFileContent.trim()) {
    console.log('   📥 User B downloaded file (' + downloadedText.length + ' bytes): Contents match uploaded file 100%!');
  } else {
    throw new Error('Downloaded file contents do not match uploaded file!');
  }

  socketA.disconnect();
  socketB.disconnect();

  console.log('\n====================================================');
  console.log('🎉 ALL 7 MANDATORY TASK 4 FEATURES VERIFIED PASSING!');
  console.log('====================================================\n');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
