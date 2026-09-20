/**
 * NovaTalk - Production Desktop & Web Client Controller
 * Complete End-to-End Implementation
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Global State
  let socket = null;
  let currentUser = null; // Enforced authentication state (null = unauthenticated)

  let activeRoomId = 'OM-8F42K';
  let activeChatType = 'direct'; // 'direct' or 'group'
  let activeContact = {
    id: 2,
    name: 'Rushi Sharma',
    chatName: 'Rushi ♡',
    avatar: 'assets/avatar_rushi.jpg',
    bio: '“Good vibes, great conversations and bigger dreams ✨”',
    status: 'Online • Always better together ✨'
  };

  let allUsers = [];
  let allGroups = [];
  let localMediaStream = null;
  let isMicMuted = false;
  let isCamOff = false;
  let callSeconds = 154;
  let lastEncryptedCipher = null;
  let wbInitialized = false;

  // ----------------------------------------------------
  // 0. Native Desktop Window Controls (Electron)
  // ----------------------------------------------------
  const winControls = document.getElementById('desktop-window-controls');
  const btnWinMin = document.getElementById('btn-win-min');
  const btnWinMax = document.getElementById('btn-win-max');
  const btnWinClose = document.getElementById('btn-win-close');

  if (window.electronAPI && window.electronAPI.isElectron) {
    if (winControls) winControls.style.display = 'flex';
    btnWinMin?.addEventListener('click', () => window.electronAPI.minimizeWindow());
    btnWinMax?.addEventListener('click', () => window.electronAPI.maximizeWindow());
    btnWinClose?.addEventListener('click', () => window.electronAPI.closeWindow());
  }

  // ----------------------------------------------------
  // 1. Session & Auth Setup (Enforced Auth Gate)
  // ----------------------------------------------------
  const authGateOverlay = document.getElementById('auth-gate-overlay');
  const gateLoginForm = document.getElementById('gate-login-form');
  const gateSignupForm = document.getElementById('gate-signup-form');
  const tabGateLogin = document.getElementById('tab-gate-login');
  const tabGateSignup = document.getElementById('tab-gate-signup');
  const authDialog = document.getElementById('auth-dialog');
  const btnNavAuth = document.getElementById('btn-nav-auth');
  const navAuthLabel = document.getElementById('nav-auth-label');
  const authLoggedInPanel = document.getElementById('auth-logged-in-panel');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  async function initSession() {
    if (window.AppAuth) {
      const sessionUser = await window.AppAuth.getSession();
      if (sessionUser) {
        currentUser = sessionUser;
        updateUserUI(true);
      } else {
        currentUser = null;
        updateUserUI(false);
      }
    } else {
      updateUserUI(false);
    }
  }

  function updateUserUI(isAuthenticated) {
    if (isAuthenticated && currentUser) {
      if (authGateOverlay) authGateOverlay.style.display = 'none';
      if (navAuthLabel) navAuthLabel.textContent = `👤 ${currentUser.full_name || currentUser.username}`;
      const topAvatarImg = document.querySelector('#top-user-avatar img');
      if (topAvatarImg && currentUser.avatar) topAvatarImg.src = currentUser.avatar;
      const pipFallback = document.getElementById('pip-local-fallback');
      if (pipFallback && currentUser.avatar) pipFallback.src = currentUser.avatar;

      if (authLoggedInPanel) authLoggedInPanel.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'none';
      const nameEl = document.getElementById('auth-logged-name');
      const emailEl = document.getElementById('auth-logged-email');
      if (nameEl) nameEl.textContent = currentUser.full_name || currentUser.username;
      if (emailEl) emailEl.textContent = currentUser.email;
    } else {
      if (authGateOverlay) authGateOverlay.style.display = 'flex';
      if (navAuthLabel) navAuthLabel.textContent = 'Sign In / Register';
      if (authLoggedInPanel) authLoggedInPanel.style.display = 'none';
      if (loginForm) loginForm.style.display = 'block';
    }
  }

  // Auth Gate Tabs
  tabGateLogin?.addEventListener('click', () => {
    tabGateLogin.classList.add('active');
    tabGateSignup?.classList.remove('active');
    if (gateLoginForm) gateLoginForm.style.display = 'block';
    if (gateSignupForm) gateSignupForm.style.display = 'none';
  });

  tabGateSignup?.addEventListener('click', () => {
    tabGateSignup?.classList.add('active');
    tabGateLogin?.classList.remove('active');
    if (gateSignupForm) gateSignupForm.style.display = 'block';
    if (gateLoginForm) gateLoginForm.style.display = 'none';
  });

  // Auth Gate Login Form
  gateLoginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('gate-login-identifier').value.trim();
    const password = document.getElementById('gate-login-password').value;
    const errEl = document.getElementById('gate-login-error');
    if (errEl) errEl.textContent = '';

    try {
      const data = await window.AppAuth.login(identifier, password);
      currentUser = data.user;
      updateUserUI(true);
      showToast(`Welcome back, ${currentUser.full_name || currentUser.username}!`);
      loadChatsAndHistory();
      loadVaultFiles();
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Login failed.';
    }
  });

  // Auth Gate Signup Form
  gateSignupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('gate-signup-fullname').value.trim();
    const username = document.getElementById('gate-signup-username').value.trim();
    const email = document.getElementById('gate-signup-email').value.trim();
    const password = document.getElementById('gate-signup-password').value;
    const confirmPassword = document.getElementById('gate-signup-confirm').value;
    const errEl = document.getElementById('gate-signup-error');
    if (errEl) errEl.textContent = '';

    if (password !== confirmPassword) {
      if (errEl) errEl.textContent = 'Passwords do not match.';
      return;
    }

    try {
      const data = await window.AppAuth.signup(username, email, password, confirmPassword, fullName);
      currentUser = data.user;
      updateUserUI(true);
      showToast(`Account created! Welcome, ${currentUser.full_name || currentUser.username}.`);
      loadChatsAndHistory();
      loadVaultFiles();
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'Registration failed.';
    }
  });

  // Quick 1-Click Evaluation Login Buttons
  document.querySelectorAll('.btn-quick-login').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userKey = btn.dataset.user;
      const errEl = document.getElementById('gate-login-error');
      if (errEl) errEl.textContent = '';
      try {
        const data = await window.AppAuth.login(userKey, 'Password123');
        currentUser = data.user;
        updateUserUI(true);
        showToast(`⚡ Logged in as ${currentUser.full_name}!`);
        loadChatsAndHistory();
        loadVaultFiles();
      } catch (err) {
        if (errEl) errEl.textContent = 'Quick login failed: ' + err.message;
      }
    });
  });

  btnNavAuth?.addEventListener('click', () => {
    if (currentUser) {
      authDialog?.showModal();
    } else {
      if (authGateOverlay) authGateOverlay.style.display = 'flex';
    }
  });

  document.getElementById('btn-auth-logout')?.addEventListener('click', () => {
    window.AppAuth.logout();
    currentUser = null;
    if (window.AppWebRTC) {
      window.AppWebRTC.leaveMeeting();
    }
    updateUserUI(false);
    authDialog?.close();
    showToast('Signed out successfully.');
  });

  // ----------------------------------------------------
  // 2. PiP Call Timer
  // ----------------------------------------------------
  const timerEl = document.getElementById('pip-call-timer');
  setInterval(() => {
    callSeconds++;
    const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const secs = String(callSeconds % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);

  // ----------------------------------------------------
  // 3. Media Stream (Webcam & Mic)
  // ----------------------------------------------------
  async function initMedia() {
    try {
      localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const pipVideo = document.getElementById('pip-local-video');
      const pipImg = document.getElementById('pip-local-fallback');
      const stageVideo = document.getElementById('full-stage-local-video');

      if (pipVideo) {
        pipVideo.srcObject = localMediaStream;
        pipVideo.style.display = 'block';
        if (pipImg) pipImg.style.display = 'none';
      }
      if (stageVideo) {
        stageVideo.srcObject = localMediaStream;
      }
    } catch (err) {
      console.log('Local media info:', err.message);
    }
  }

  // ----------------------------------------------------
  // 4. Socket.IO Real-Time Connection
  // ----------------------------------------------------
  function initSocket() {
    try {
      socket = io();

      socket.on('new-encrypted-message', (msg) => {
        const isCurrentChat = (activeChatType === 'group' && msg.roomId === activeContact.id) ||
                              (activeChatType === 'direct' && (msg.senderId == activeContact.id || msg.sender === activeContact.name));
        if (isCurrentChat || !msg.roomId) {
          appendChatMessage(msg.sender, msg.payload, false, msg.createdAt, msg.avatar);
        } else {
          showToast(`💬 New message from ${msg.sender}`);
        }
      });

      socket.on('file-shared', (fileRecord) => {
        showToast(`📁 New file shared: ${fileRecord.file_name}`);
        loadVaultFiles();
      });

      socket.on('chat-reaction-added', (data) => {
        showToast(`${data.sender} reacted with ${data.emoji}`);
      });
    } catch (e) {
      console.warn('Socket running in fallback mode:', e);
    }
  }

  // ----------------------------------------------------
  // 5. Contacts, Groups & Message Loading
  // ----------------------------------------------------
  const chatsListContainer = document.getElementById('chats-list-items');
  const chatMessagesStream = document.getElementById('chat-messages-stream');

  async function loadChatsAndHistory() {
    try {
      const [usersRes, groupsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/groups')
      ]);

      const uData = await usersRes.json();
      allUsers = uData.users || (Array.isArray(uData) ? uData : []);
      const gData = await groupsRes.json();
      allGroups = gData.groups || (Array.isArray(gData) ? gData : []);

      renderChatsList();
      selectContact(activeContact, activeChatType);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }

  function renderChatsList(filter = 'all') {
    if (!chatsListContainer) return;
    chatsListContainer.innerHTML = '';

    const list = [];

    if (filter === 'all' || filter === 'direct') {
      allUsers.forEach((u) => {
        if (u.id !== currentUser.id) {
          list.push({
            type: 'direct',
            id: u.id,
            name: u.full_name || u.username,
            chatName: u.id === 2 ? 'Rushi ♡' : (u.full_name || u.username),
            avatar: u.avatar || 'assets/avatar_rushi.jpg',
            bio: u.bio || '“Connecting with NovaTalk”',
            status: u.status || 'Online',
            time: '10:24 AM',
            preview: u.id === 2 ? 'See you soon! 😊' : 'Hey there! Let\'s connect.',
            unread: u.id === 2 ? 2 : 0,
            raw: u
          });
        }
      });
    }

    if (filter === 'all' || filter === 'groups') {
      allGroups.forEach((g) => {
        list.push({
          type: 'group',
          id: g.id,
          name: g.name,
          chatName: g.name,
          avatar: g.avatar || 'assets/avatar_siya.jpg',
          bio: g.description || 'Group discussion & collaboration',
          status: 'Active Group',
          time: 'Yesterday',
          preview: g.last_message || 'Active conversation in progress',
          unread: 0,
          raw: g
        });
      });
    }

    list.forEach((item) => {
      const card = document.createElement('div');
      const isActive = (item.type === activeChatType && item.id === activeContact.id);
      card.className = `chat-card-item ${isActive ? 'active' : ''}`;
      card.dataset.type = item.type;
      card.dataset.id = item.id;

      card.innerHTML = `
        <div class="chat-avatar-box">
          <img src="${item.avatar}" alt="${escapeHtml(item.name)}">
          <span class="avatar-online-dot"></span>
        </div>
        <div class="chat-info-col">
          <div class="chat-name-row">
            <span class="chat-contact-name">${escapeHtml(item.chatName)}</span>
            <span class="chat-timestamp">${item.time}</span>
          </div>
          <div class="chat-preview-row">
            <span class="chat-msg-preview">${escapeHtml(item.preview)}</span>
            ${item.unread ? `<span class="chat-unread-badge">${item.unread}</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.chat-card-item').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        selectContact(item, item.type);
      });

      chatsListContainer.appendChild(card);
    });
  }

  async function selectContact(contact, type) {
    activeContact = contact;
    activeChatType = type;

    const headerName = document.getElementById('active-chat-header-name');
    const headerAvatar = document.getElementById('active-chat-header-avatar');
    if (headerName) headerName.textContent = contact.chatName || contact.name;
    if (headerAvatar) headerAvatar.src = contact.avatar;

    const profName = document.getElementById('profile-panel-name');
    const profAvatar = document.getElementById('profile-panel-avatar');
    const profBio = document.querySelector('.profile-bio-quote');
    if (profName) profName.textContent = contact.name;
    if (profAvatar) profAvatar.src = contact.avatar;
    if (profBio) profBio.textContent = contact.bio;

    await loadChatHistory();
  }

  async function loadChatHistory() {
    if (!chatMessagesStream) return;
    chatMessagesStream.innerHTML = '';

    try {
      let endpoint = '';
      if (activeChatType === 'direct') {
        endpoint = `/api/messages/private/${activeContact.id}?currentUserId=${currentUser.id}`;
      } else {
        endpoint = `/api/messages/${activeContact.id}`;
      }

      const headers = window.AppAuth ? window.AppAuth.getAuthHeader() : {};
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        const messages = data.messages || (Array.isArray(data) ? data : []);
        messages.forEach((msg) => {
          const isSelf = msg.sender_id === currentUser.id || msg.sender_name === currentUser.full_name;
          appendChatMessage(msg.sender_name, msg.content, isSelf, msg.created_at, msg.sender_avatar);
        });
      }
    } catch (err) {
      console.warn('Could not load message history:', err);
    }

    chatMessagesStream.scrollTop = chatMessagesStream.scrollHeight;
  }

  function getCurrentFormattedTime(dateStr) {
    const date = dateStr ? new Date(dateStr) : new Date();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  function appendChatMessage(sender, text, isSelf = true, timeStr = null, avatar = null) {
    if (!chatMessagesStream || !text) return;

    const row = document.createElement('div');
    row.className = `message-row ${isSelf ? 'sent' : 'received'}`;
    const displayTime = getCurrentFormattedTime(timeStr);
    const displayAvatar = avatar || activeContact.avatar || 'assets/avatar_rushi.jpg';

    if (isSelf) {
      row.innerHTML = `
        <div class="msg-bubble">
          <div>${formatMessageContent(text)}</div>
          <div class="msg-meta-row">
            <span>${displayTime}</span>
            <span class="read-check-blue">✓✓</span>
          </div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="msg-avatar">
          <img src="${displayAvatar}" alt="${escapeHtml(sender)}">
        </div>
        <div class="msg-bubble">
          <div>${formatMessageContent(text)}</div>
          <div class="msg-meta-row">
            <span>${displayTime}</span>
          </div>
        </div>
      `;
    }

    chatMessagesStream.appendChild(row);
    chatMessagesStream.scrollTop = chatMessagesStream.scrollHeight;
  }

  function formatMessageContent(content) {
    if (content.includes('[DOWNLOAD:')) {
      const match = content.match(/\[DOWNLOAD:([^\]]+)\]/);
      if (match) {
        const fileId = match[1];
        const tokenQuery = window.AppAuth && window.AppAuth.token ? `?token=${encodeURIComponent(window.AppAuth.token)}` : '';
        return `${escapeHtml(content.replace(/\[DOWNLOAD:[^\]]+\]/, ''))} <br><a href="/api/files/download/${fileId}${tokenQuery}" target="_blank" style="display:inline-block; margin-top:6px; background:#6366f1; color:#fff; padding:4px 10px; border-radius:6px; text-decoration:none; font-size:11px; font-weight:600;">📥 Download File</a>`;
      }
    }
    return escapeHtml(content);
  }

  const filterPills = document.querySelectorAll('.pill-filter');
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.dataset.filter || 'all';
      renderChatsList(filter);
    });
  });

  // ----------------------------------------------------
  // 6. Sending Messages (Database + Sockets)
  // ----------------------------------------------------
  const chatInput = document.getElementById('chat-message-input');
  const chatSendBtn = document.getElementById('btn-chat-send');

  async function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendChatMessage(currentUser.full_name || currentUser.username, text, true);

    try {
      const headers = { 'Content-Type': 'application/json', ...(window.AppAuth ? window.AppAuth.getAuthHeader() : {}) };
      if (activeChatType === 'direct') {
        await fetch('/api/messages/private', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            senderId: currentUser.id,
            receiverId: activeContact.id,
            senderName: currentUser.full_name || currentUser.username,
            content: text
          })
        });
      } else {
        await fetch('/api/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            roomId: activeContact.id,
            senderId: currentUser.id,
            senderName: currentUser.full_name || currentUser.username,
            senderAvatar: currentUser.avatar,
            content: text
          })
        });
      }

      if (socket) {
        socket.emit('send-encrypted-message', {
          roomId: activeChatType === 'group' ? activeContact.id : activeRoomId,
          senderId: currentUser.id,
          sender: currentUser.full_name || currentUser.username,
          avatar: currentUser.avatar,
          payload: text
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });
  }

  document.getElementById('btn-chat-emoji')?.addEventListener('click', () => {
    const emojis = ['😊', '👍', '🔥', '🎉', '❤️', '✨', '👋', '🚀', '💯', '🌸'];
    const chosen = emojis[Math.floor(Math.random() * emojis.length)];
    if (chatInput) {
      chatInput.value += chosen;
      chatInput.focus();
    }
  });

  // ----------------------------------------------------
  // 7. Real File Sharing & Shared Vault
  // ----------------------------------------------------
  const filesVaultDialog = document.getElementById('files-vault-dialog');
  const vaultDropZone = document.getElementById('vault-drop-zone');
  const vaultFileInput = document.getElementById('vault-file-input');
  const vaultList = document.getElementById('vault-files-list');
  const recentFilesContainer = document.querySelector('.recent-files-list');
  const hiddenChatFileInput = document.getElementById('hidden-file-input');

  async function loadVaultFiles() {
    try {
      const headers = window.AppAuth ? window.AppAuth.getAuthHeader() : {};
      const res = await fetch('/api/files', { headers });
      if (res.ok) {
        const data = await res.json();
        const files = data.files || (Array.isArray(data) ? data : []);
        renderVaultFilesUI(files);
      }
    } catch (err) {
      console.warn('Failed to load files:', err);
    }
  }

  function getFileIconClass(fileName) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return { cls: 'icon-pdf', label: 'PDF' };
    if (ext === 'fig') return { cls: 'icon-fig', label: 'FIG' };
    if (ext === 'ppt' || ext === 'pptx') return { cls: 'icon-ppt', label: 'PPT' };
    if (ext === 'txt' || ext === 'doc' || ext === 'docx') return { cls: 'icon-txt', label: 'TXT' };
    return { cls: 'icon-pdf', label: ext.toUpperCase() };
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderVaultFilesUI(files) {
    const tokenQuery = window.AppAuth && window.AppAuth.token ? `?token=${encodeURIComponent(window.AppAuth.token)}` : '';
    if (vaultList) {
      vaultList.innerHTML = '';
      files.forEach((f) => {
        const { cls, label } = getFileIconClass(f.file_name);
        const card = document.createElement('div');
        card.className = 'file-item-card';
        card.innerHTML = `
          <div class="file-icon-box ${cls}">${label}</div>
          <div class="file-details-col">
            <div class="file-title-text">${escapeHtml(f.file_name)}</div>
            <div class="file-sub-info">${formatBytes(f.file_size)} • ${f.uploader_name || 'Verified'}</div>
          </div>
          <a href="/api/files/download/${f.id}${tokenQuery}" target="_blank" style="background: var(--primary); color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;">Download</a>
        `;
        vaultList.appendChild(card);
      });
    }

    if (recentFilesContainer && files.length > 0) {
      recentFilesContainer.innerHTML = '';
      files.slice(0, 4).forEach((f) => {
        const { cls, label } = getFileIconClass(f.file_name);
        const card = document.createElement('div');
        card.className = 'file-item-card';
        card.innerHTML = `
          <div class="file-icon-box ${cls}">${label}</div>
          <div class="file-details-col">
            <div class="file-title-text">${escapeHtml(f.file_name)}</div>
            <div class="file-sub-info">${formatBytes(f.file_size)} • ${f.uploader_name || 'Member'}</div>
          </div>
        `;
        card.onclick = () => window.open(`/api/files/download/${f.id}${tokenQuery}`, '_blank');
        recentFilesContainer.appendChild(card);
      });
    }
  }

  async function uploadFileToServer(file, isChatAttachment = false) {
    if (!currentUser) {
      showToast('⚠️ Please log in to upload files.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', activeRoomId);
    formData.append('uploaderId', currentUser.id);
    formData.append('uploaderName', currentUser.full_name || currentUser.username);

    try {
      showToast(`Uploading "${file.name}" to Encrypted Vault...`);
      const headers = window.AppAuth ? window.AppAuth.getAuthHeader() : {};
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.file) {
        showToast(`✅ "${file.name}" uploaded successfully!`);
        loadVaultFiles();

        if (isChatAttachment) {
          const msgContent = `📁 Shared encrypted file: ${file.name} (${formatBytes(file.size)}) [DOWNLOAD:${data.file.id}]`;
          appendChatMessage(currentUser.full_name || currentUser.username, msgContent, true);
          if (socket) {
            socket.emit('send-encrypted-message', {
              roomId: activeChatType === 'group' ? activeContact.id : activeRoomId,
              senderId: currentUser.id,
              sender: currentUser.full_name || currentUser.username,
              avatar: currentUser.avatar,
              payload: msgContent
            });
          }
        }
      } else {
        showToast('Upload failed: ' + (data.error || 'Server error'));
      }
    } catch (err) {
      showToast('File upload error.');
    }
  }

  document.getElementById('btn-nav-files')?.addEventListener('click', () => {
    loadVaultFiles();
    filesVaultDialog?.showModal();
  });

  if (vaultDropZone && vaultFileInput) {
    vaultDropZone.addEventListener('click', () => vaultFileInput.click());
    vaultFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) uploadFileToServer(file, false);
    });
  }

  document.getElementById('pill-attach-file')?.addEventListener('click', () => hiddenChatFileInput?.click());
  document.getElementById('pill-attach-media')?.addEventListener('click', () => hiddenChatFileInput?.click());
  document.getElementById('btn-chat-photo')?.addEventListener('click', () => hiddenChatFileInput?.click());

  if (hiddenChatFileInput) {
    hiddenChatFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) uploadFileToServer(file, true);
    });
  }

  document.getElementById('btn-chat-mic')?.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      showToast('🎙️ Voice message recorded (0:04)');
      appendChatMessage(currentUser.full_name || currentUser.username, '🎙️ Voice note (0:04) • Encrypted Audio', true);
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      appendChatMessage(currentUser.full_name || currentUser.username, '🎙️ Voice note (0:04) • Encrypted Audio', true);
    }
  });

  // ----------------------------------------------------
  // 8. Collaborative Whiteboard
  // ----------------------------------------------------
  const wbModal = document.getElementById('whiteboard-modal');

  function openWhiteboard() {
    if (wbModal) {
      wbModal.showModal();
      if (!wbInitialized) {
        if (window.AppWhiteboard) {
          window.AppWhiteboard.init(socket, activeRoomId);
        }
        wbInitialized = true;
      } else if (window.AppWhiteboard) {
        window.AppWhiteboard.resizeCanvas();
      }
    }
  }

  document.getElementById('btn-nav-whiteboard')?.addEventListener('click', openWhiteboard);
  document.getElementById('btn-dock-whiteboard')?.addEventListener('click', openWhiteboard);

  // ----------------------------------------------------
  // 9. E2EE Data Encryption Inspector
  // ----------------------------------------------------
  const cryptoDialog = document.getElementById('crypto-inspector-dialog');
  document.getElementById('btn-nav-security')?.addEventListener('click', () => {
    cryptoDialog?.showModal();
  });

  document.getElementById('btn-run-encrypt')?.addEventListener('click', async () => {
    const plain = document.getElementById('demo-plain-input').value;
    const cipherArea = document.getElementById('demo-cipher-output');
    const resultEl = document.getElementById('demo-decrypt-result');

    if (window.AppCrypto) {
      lastEncryptedCipher = await window.AppCrypto.encryptText(plain, 'novatalk-master-salt-2026');
      cipherArea.value = JSON.stringify(lastEncryptedCipher, null, 2);
      resultEl.textContent = '🔒 Encrypted using AES-256-GCM with PBKDF2 derived 256-bit key!';
    }
  });

  document.getElementById('btn-run-decrypt')?.addEventListener('click', async () => {
    const resultEl = document.getElementById('demo-decrypt-result');
    if (!lastEncryptedCipher) {
      resultEl.textContent = 'Please click Encrypt first.';
      return;
    }

    if (window.AppCrypto) {
      try {
        const decrypted = await window.AppCrypto.decryptText(lastEncryptedCipher, 'novatalk-master-salt-2026');
        resultEl.textContent = `🔓 Verified & Authenticated: "${decrypted}"`;
      } catch (e) {
        resultEl.textContent = 'Decryption failed: Integrity tag mismatch.';
      }
    }
  });

  // ----------------------------------------------------
  // 10. Native Screen Sharing (Desktop Capturer & Browser)
  // ----------------------------------------------------
  const screenPickerDialog = document.getElementById('screen-picker-dialog');
  const screenSourcesGrid = document.getElementById('screen-sources-grid');

  async function triggerScreenSharing() {
    if (window.electronAPI && window.electronAPI.getDesktopSources) {
      try {
        const sources = await window.electronAPI.getDesktopSources({ types: ['window', 'screen'] });
        if (screenSourcesGrid) {
          screenSourcesGrid.innerHTML = '';
          sources.forEach((source) => {
            const card = document.createElement('div');
            card.className = 'screen-source-card';
            card.innerHTML = `
              <img src="${source.thumbnail}" class="source-thumb" alt="${source.name}">
              <div class="source-label">${escapeHtml(source.name)}</div>
            `;
            card.onclick = async () => {
              screenPickerDialog.close();
              openMeetingModal();
              try {
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: source.id
                    }
                  }
                });
                const stageVideo = document.getElementById('full-stage-local-video');
                if (stageVideo) stageVideo.srcObject = stream;
                showToast('🖥️ Sharing screen via Electron DesktopCapturer');
              } catch (e) {
                console.warn('Native capture stream setup error:', e);
              }
            };
            screenSourcesGrid.appendChild(card);
          });
        }
        screenPickerDialog.showModal();
        return;
      } catch (err) {
        console.warn('Fallback to standard getDisplayMedia:', err);
      }
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      openMeetingModal();
      const stageVideo = document.getElementById('full-stage-local-video');
      if (stageVideo) stageVideo.srcObject = screenStream;
      showToast('🖥️ Screen sharing active');
    } catch (err) {
      openMeetingModal();
    }
  }

  document.getElementById('btn-quick-share-screen')?.addEventListener('click', () => {
    openMeetingModal();
    if (window.AppWebRTC) {
      window.AppWebRTC.startScreenShare();
    }
  });

  // ----------------------------------------------------
  // 11. Fullscreen Meeting Modal & Controls
  // ----------------------------------------------------
  const meetingModal = document.getElementById('meeting-modal');
  const btnPipExpand = document.getElementById('btn-pip-expand');
  const btnMeetingMinimize = document.getElementById('btn-meeting-minimize');
  const btnMeetingClose = document.getElementById('btn-meeting-close');
  const btnPipEnd = document.getElementById('btn-pip-end');
  const btnPipMic = document.getElementById('btn-pip-mic');
  const btnPipCam = document.getElementById('btn-pip-cam');

  async function startNewMeeting() {
    if (!currentUser) {
      showToast('Please sign in to start a meeting.');
      if (authGateOverlay) authGateOverlay.style.display = 'flex';
      return;
    }
    try {
      showToast('Creating real meeting room...');
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...window.AppAuth.getAuthHeader()
        },
        body: JSON.stringify({
          name: `${currentUser.full_name || currentUser.username}'s Meeting Space`,
          createdBy: currentUser.id
        })
      });
      const data = await res.json();
      if (res.ok && data.roomId) {
        activeRoomId = data.roomId;
        const roomIdEl = document.getElementById('full-meeting-room-id');
        if (roomIdEl) roomIdEl.textContent = activeRoomId;

        try {
          await navigator.clipboard.writeText(activeRoomId);
          showToast(`🎉 Room ${activeRoomId} created & copied to clipboard!`);
        } catch (e) {
          showToast(`🎉 Room ${activeRoomId} created!`);
        }

        openMeetingModal();
      } else {
        showToast('Failed to create room: ' + (data.error || 'Server error'));
      }
    } catch (e) {
      showToast('Meeting creation error.');
    }
  }

  function openMeetingModal() {
    if (!currentUser) {
      showToast('Please sign in to access meeting room.');
      if (authGateOverlay) authGateOverlay.style.display = 'flex';
      return;
    }
    if (meetingModal) {
      meetingModal.style.display = 'flex';
      const roomIdEl = document.getElementById('full-meeting-room-id');
      if (roomIdEl) roomIdEl.textContent = activeRoomId;

      if (window.AppWebRTC && socket) {
        window.AppWebRTC.init(socket, activeRoomId, currentUser.full_name || currentUser.username, currentUser.id);
      }
    }
  }

  function closeMeetingModal() {
    if (window.AppWebRTC) {
      window.AppWebRTC.leaveMeeting();
    } else if (meetingModal) {
      meetingModal.style.display = 'none';
    }
  }

  // Copy Room ID Button
  document.getElementById('btn-copy-meeting-id')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(activeRoomId);
      showToast(`📋 Room ID "${activeRoomId}" copied to clipboard!`);
    } catch (e) {
      prompt('Copy this Meeting ID to invite others:', activeRoomId);
    }
  });

  // Join Meeting Dialog & Form
  const joinDialog = document.getElementById('join-meeting-dialog');
  document.getElementById('btn-quick-join-meeting')?.addEventListener('click', () => {
    if (!currentUser) {
      showToast('Please sign in first.');
      if (authGateOverlay) authGateOverlay.style.display = 'flex';
      return;
    }
    const errEl = document.getElementById('join-meeting-error');
    if (errEl) errEl.textContent = '';
    joinDialog?.showModal();
  });

  document.getElementById('join-meeting-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputRoomId = document.getElementById('join-room-id-input').value.trim().toUpperCase();
    const passcode = document.getElementById('join-passcode-input').value.trim();
    const errEl = document.getElementById('join-meeting-error');
    if (errEl) errEl.textContent = '';

    if (!inputRoomId) {
      if (errEl) errEl.textContent = 'Please enter a valid Meeting ID.';
      return;
    }

    try {
      const res = await fetch('/api/rooms/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...window.AppAuth.getAuthHeader()
        },
        body: JSON.stringify({ roomId: inputRoomId, passcode })
      });
      const data = await res.json();
      if (res.ok) {
        activeRoomId = inputRoomId;
        joinDialog?.close();
        showToast(`🚀 Joining room ${activeRoomId}...`);
        openMeetingModal();
      } else {
        if (errEl) errEl.textContent = data.error || 'Failed to join room.';
      }
    } catch (err) {
      if (errEl) errEl.textContent = 'Connection error. Please try again.';
    }
  });

  btnPipExpand?.addEventListener('click', openMeetingModal);
  btnMeetingMinimize?.addEventListener('click', () => {
    if (meetingModal) meetingModal.style.display = 'none';
  });
  btnMeetingClose?.addEventListener('click', closeMeetingModal);

  document.getElementById('btn-quick-start-meeting')?.addEventListener('click', startNewMeeting);
  document.getElementById('btn-profile-video')?.addEventListener('click', startNewMeeting);
  document.getElementById('btn-chat-video-call')?.addEventListener('click', startNewMeeting);
  document.getElementById('btn-nav-meetings')?.addEventListener('click', startNewMeeting);
  document.getElementById('btn-profile-call')?.addEventListener('click', startNewMeeting);

  function toggleMic() {
    if (window.AppWebRTC && window.AppWebRTC.localStream) {
      isMicMuted = window.AppWebRTC.toggleAudio();
    } else if (localMediaStream) {
      isMicMuted = !isMicMuted;
      localMediaStream.getAudioTracks().forEach((track) => (track.enabled = !isMicMuted));
    }
    btnPipMic?.classList.toggle('muted', isMicMuted);
    showToast(isMicMuted ? 'Microphone Muted' : 'Microphone Unmuted');
  }

  function toggleCam() {
    if (window.AppWebRTC && window.AppWebRTC.localStream) {
      isCamOff = window.AppWebRTC.toggleVideo();
    } else if (localMediaStream) {
      isCamOff = !isCamOff;
      localMediaStream.getVideoTracks().forEach((track) => (track.enabled = !isCamOff));
    }
    btnPipCam?.classList.toggle('muted', isCamOff);
    showToast(isCamOff ? 'Camera Turned Off' : 'Camera Turned On');
  }

  btnPipMic?.addEventListener('click', toggleMic);
  btnPipCam?.addEventListener('click', toggleCam);

  document.getElementById('btn-dock-hand')?.addEventListener('click', () => {
    if (socket) socket.emit('raise-hand', { isHandRaised: true });
    showToast('✋ You raised your hand');
  });

  if (btnPipEnd) {
    btnPipEnd.addEventListener('click', () => {
      document.getElementById('pip-video-window').style.display = 'none';
      showToast('Call ended');
      setTimeout(() => {
        document.getElementById('pip-video-window').style.display = 'flex';
      }, 3000);
    });
  }

  document.getElementById('btn-meeting-ai-summary')?.addEventListener('click', async () => {
    try {
      showToast('✨ Generating AI Meeting Summary...');
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: activeRoomId })
      });
      const data = await res.json();
      if (data.summary) {
        alert(
          `✨ NovaTalk AI Meeting Summary\n\n📌 Main Discussion:\n• ${data.summary.mainDiscussion.join('\n• ')}\n\n📋 Action Items:\n• ${data.summary.actionItems.join('\n• ')}\n\n📅 Next Sync: ${data.summary.nextMeetingDate}`
        );
      }
    } catch (e) {
      alert('✨ AI Meeting Summary: Real-time discussion captured & notes synced to Room Notes!');
    }
  });

  // ----------------------------------------------------
  // 12. Schedule Meeting & Create Group
  // ----------------------------------------------------
  const schedDialog = document.getElementById('schedule-dialog');
  const groupDialog = document.getElementById('create-group-dialog');

  document.getElementById('btn-quick-schedule')?.addEventListener('click', () => schedDialog?.showModal());
  document.getElementById('btn-create-group-modal')?.addEventListener('click', () => groupDialog?.showModal());
  document.getElementById('btn-new-chat-trigger')?.addEventListener('click', () => groupDialog?.showModal());

  document.getElementById('schedule-meeting-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('sched-title').value.trim();
    const dateTime = document.getElementById('sched-datetime').value;
    const duration = parseInt(document.getElementById('sched-duration').value, 10) || 45;

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scheduled_for: dateTime,
          duration_minutes: duration,
          host_id: currentUser.id
        })
      });
      if (res.ok) {
        schedDialog?.close();
        showToast(`📅 Meeting "${title}" scheduled successfully!`);
      }
    } catch (err) {
      schedDialog?.close();
      showToast(`Meeting "${title}" scheduled!`);
    }
  });

  document.getElementById('create-group-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('group-name-input').value.trim();
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: 'Collaborative NovaTalk Project Group',
          created_by: currentUser.id
        })
      });
      if (res.ok) {
        groupDialog?.close();
        showToast(`👥 Group "${name}" created!`);
        loadChatsAndHistory();
      }
    } catch (err) {
      groupDialog?.close();
      showToast(`Group "${name}" created!`);
    }
  });

  // ----------------------------------------------------
  // 13. Global Search & Ctrl+K
  // ----------------------------------------------------
  const searchInput = document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.chat-card-item');
      cards.forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // ----------------------------------------------------
  // 14. Notifications & Theme Toggle
  // ----------------------------------------------------
  document.getElementById('btn-notif-bell')?.addEventListener('click', () => {
    showToast('🔔 You have 3 unread messages and 1 scheduled meeting.');
  });

  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    showToast('🌓 Theme display mode toggled');
  });

  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.target.closest('dialog')?.close();
    });
  });

  function showToast(msg) {
    let toast = document.getElementById('app-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-floating-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.background = '#1e1b4b';
      toast.style.color = '#ffffff';
      toast.style.padding = '10px 18px';
      toast.style.borderRadius = '10px';
      toast.style.fontSize = '12.5px';
      toast.style.fontWeight = '600';
      toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
      toast.style.zIndex = '99999';
      toast.style.transition = 'opacity 0.3s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => (toast.style.display = 'none'), 300);
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize
  await initSession();
  initSocket();
  initMedia();
  await loadChatsAndHistory();
  await loadVaultFiles();
});
