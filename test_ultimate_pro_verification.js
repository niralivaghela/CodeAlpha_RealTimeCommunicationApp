// test_ultimate_pro_verification.js
// Automated verification suite for NEXORA CONNECT ULTIMATE PRO features using native fetch

const API_BASE = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function runTests() {
  console.log('====================================================');
  console.log('  NEXORA CONNECT ULTIMATE PRO — E2E VERIFICATION   ');
  console.log('====================================================\n');

  try {
    // 1. System Health
    console.log('[1/10] Testing System Health Check...');
    const healthData = await req(`${API_BASE}/system/health`);
    console.log('✓ System Health Response:', healthData);

    // 2. User Authentication (Alice & Bob)
    console.log('\n[2/10] Registering / Logging in Test Users...');
    const timestamp = Date.now();
    const aliceData = {
      name: `Alice Pro ${timestamp}`,
      email: `alice_${timestamp}@nexora.com`,
      password: 'Password123!',
    };
    const bobData = {
      name: `Bob Pro ${timestamp}`,
      email: `bob_${timestamp}@nexora.com`,
      password: 'Password123!',
    };

    const aliceReg = await req(`${API_BASE}/auth/register`, { method: 'POST', body: aliceData });
    const aliceToken = aliceReg.token;
    const aliceUser = aliceReg.user;
    console.log(`✓ Alice registered: ${aliceUser.email} (ID: ${aliceUser.id})`);

    const bobReg = await req(`${API_BASE}/auth/register`, { method: 'POST', body: bobData });
    const bobToken = bobReg.token;
    const bobUser = bobReg.user;
    console.log(`✓ Bob registered: ${bobUser.email} (ID: ${bobUser.id})`);

    const aliceHeaders = { headers: { Authorization: `Bearer ${aliceToken}` } };
    const bobHeaders = { headers: { Authorization: `Bearer ${bobToken}` } };

    // 3. Presence Update
    console.log('\n[3/10] Testing User Presence Update...');
    const presenceRes = await req(`${API_BASE}/auth/presence`, {
      method: 'PUT',
      ...aliceHeaders,
      body: { presence: 'busy', statusMessage: 'In a deep work sprint' },
    });
    console.log('✓ Alice presence updated:', presenceRes);

    // 4. Contacts Management
    console.log('\n[4/10] Testing Contacts Address Book...');
    const addContactRes = await req(`${API_BASE}/contacts`, {
      method: 'POST',
      ...aliceHeaders,
      body: { contactUserId: bobUser.id, nickname: 'Bob Colleague' },
    });
    console.log('✓ Bob added to Alice contacts:', addContactRes.contact?.nickname || 'Saved');

    const getContactsRes = await req(`${API_BASE}/contacts`, aliceHeaders);
    console.log(`✓ Alice has ${getContactsRes.contacts.length} contacts:`, getContactsRes.contacts.map(c => c.user?.name || c.contactUser?.name));

    // 5. 1-to-1 Direct Messaging
    console.log('\n[5/10] Testing 1-to-1 Direct Messaging...');
    const sendDmRes = await req(`${API_BASE}/messages/direct`, {
      method: 'POST',
      ...aliceHeaders,
      body: { recipientId: bobUser.id, content: 'Hey Bob! Welcome to Nexora Connect Pro.' },
    });
    console.log('✓ Alice sent DM to Bob:', sendDmRes.message?.content);

    const bobDmsRes = await req(`${API_BASE}/messages/direct/${aliceUser.id}`, bobHeaders);
    console.log(`✓ Bob retrieved DM conversation: ${bobDmsRes.messages.length} messages`);

    const conversationsRes = await req(`${API_BASE}/messages/direct/conversations`, bobHeaders);
    console.log(`✓ Bob has ${conversationsRes.conversations.length} active conversations`);

    // 6. Create Meeting with Waiting Room
    console.log('\n[6/10] Testing Meeting Creation with Waiting Room...');
    const meetingRes = await req(`${API_BASE}/meetings`, {
      method: 'POST',
      ...aliceHeaders,
      body: { title: 'Executive Sync', isInstant: true, waitingRoom: true },
    });
    const meeting = meetingRes.meeting;
    console.log(`✓ Meeting created: ${meeting.title} (ID: ${meeting.meetingId}, WaitingRoom: ${meeting.waitingRoom})`);

    // 7. Meeting Collaborative Notes
    console.log('\n[7/10] Testing Meeting Notes...');
    const updateNotesRes = await req(`${API_BASE}/meetings/${meeting.meetingId}/notes`, {
      method: 'PUT',
      ...aliceHeaders,
      body: { content: '# Agenda\n1. Review Q3 product rollout\n2. Demonstrate Nexora desktop features' },
    });
    console.log('✓ Notes updated:', updateNotesRes.notes.content.slice(0, 30) + '...');

    const getNotesRes = await req(`${API_BASE}/meetings/${meeting.meetingId}/notes`, bobHeaders);
    console.log('✓ Bob fetched meeting notes length:', getNotesRes.notes.content.length);

    // 8. Meeting Live Polls
    console.log('\n[8/10] Testing Meeting Polls...');
    const createPollRes = await req(`${API_BASE}/meetings/${meeting.meetingId}/polls`, {
      method: 'POST',
      ...aliceHeaders,
      body: {
        question: 'How is the audio quality?',
        options: ['Crystal Clear', 'Acceptable', 'Needs Improvement'],
      },
    });
    const poll = createPollRes.poll;
    console.log(`✓ Poll created: "${poll.question}" (ID: ${poll.pollId})`);

    const voteRes = await req(`${API_BASE}/meetings/${meeting.meetingId}/polls/${poll.pollId}/vote`, {
      method: 'POST',
      ...bobHeaders,
      body: { optionId: poll.options[0].id },
    });
    console.log('✓ Bob voted on poll option 0. Votes:', voteRes.poll.options.map(o => `${o.text}: ${o.votes.length}`));

    // 9. Meeting Audience Q&A
    console.log('\n[9/10] Testing Audience Q&A...');
    const qnaRes = await req(`${API_BASE}/meetings/${meeting.meetingId}/qna`, {
      method: 'POST',
      ...bobHeaders,
      body: { question: 'Will this application support custom virtual backgrounds?' },
    });
    const question = qnaRes.question;
    console.log(`✓ Question posted by Bob: "${question.question}" (ID: ${question.questionId})`);

    const upvoteRes = await req(`${API_BASE}/meetings/${meeting.meetingId}/qna/${question.questionId}/upvote`, {
      method: 'POST',
      ...aliceHeaders,
      body: {},
    });
    console.log('✓ Question upvoted by Alice. Upvotes:', upvoteRes.question.upvotes.length);

    const answerRes = await req(`${API_BASE}/meetings/${meeting.meetingId}/qna/${question.questionId}/answer`, {
      method: 'PUT',
      ...aliceHeaders,
      body: { answer: 'Yes, background blur and custom virtual images are supported.' },
    });
    console.log('✓ Question answered by Alice:', answerRes.question.answer);

    // 10. Global Debounced Search & Audit Logs
    console.log('\n[10/10] Testing Global Unified Search & Audit Logs...');
    const searchRes = await req(`${API_BASE}/search?q=Alice`, aliceHeaders);
    console.log(`✓ Search results for "Alice":`, {
      people: searchRes.people.length,
      meetings: searchRes.meetings.length,
      files: searchRes.files.length,
      messages: searchRes.messages.length,
    });

    const auditRes = await req(`${API_BASE}/system/activity-logs`, aliceHeaders);
    console.log(`✓ Activity Audit Log contains ${auditRes.logs.length} logged events`);

    console.log('\n====================================================');
    console.log('🎉 ALL 10 VERIFICATION SUITES PASSED FLAWLESSLY!    ');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

runTests();
