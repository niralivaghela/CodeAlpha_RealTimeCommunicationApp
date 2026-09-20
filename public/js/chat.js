/**
 * Advanced Chat Module (Private 1-to-1, Emoji Picker, Reactions, Reply, Typing Indicator)
 */

const AppChat = {
  socket: null,
  roomId: null,
  roomSecret: null,
  currentUsername: 'Guest',
  selectedRecipientSocketId: null, // null = Everyone
  replyingToMsg: null,
  typingTimeout: null,

  init(socketInstance, roomId, roomSecret, username) {
    this.socket = socketInstance;
    this.roomId = roomId;
    this.roomSecret = roomSecret;
    this.currentUsername = username;

    this.bindEvents();
    this.bindSocket();
  },

  bindEvents() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const recipientSelect = document.getElementById('chat-recipient-select');

    if (recipientSelect) {
      recipientSelect.addEventListener('change', (e) => {
        this.selectedRecipientSocketId = e.target.value || null;
      });
    }

    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => this.sendMessage());
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendMessage();
        else this.handleTyping();
      });
    }

    // Emoji Picker toggles
    const emojiBtn = document.getElementById('chat-emoji-btn');
    const emojiPicker = document.getElementById('chat-emoji-picker');
    if (emojiBtn && emojiPicker) {
      emojiBtn.addEventListener('click', () => {
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
      });

      document.querySelectorAll('.emoji-item').forEach((item) => {
        item.addEventListener('click', () => {
          chatInput.value += item.textContent;
          chatInput.focus();
          emojiPicker.style.display = 'none';
        });
      });
    }

    // Cancel reply button
    const cancelReplyBtn = document.getElementById('cancel-reply-btn');
    if (cancelReplyBtn) {
      cancelReplyBtn.addEventListener('click', () => this.cancelReply());
    }
  },

  bindSocket() {
    if (!this.socket) return;

    this.socket.on('new-encrypted-message', async (msgData) => {
      this.renderMessage(msgData);
    });

    this.socket.on('peer-typing', ({ username, isTyping }) => {
      const typingEl = document.getElementById('chat-typing-indicator');
      if (typingEl) {
        if (isTyping && username !== this.currentUsername) {
          typingEl.textContent = `✍️ ${username} is typing...`;
          typingEl.style.display = 'block';
        } else {
          typingEl.style.display = 'none';
        }
      }
    });

    this.socket.on('message-reaction-added', ({ messageId, emoji, sender }) => {
      const msgCard = document.getElementById(`msg-${messageId}`);
      if (msgCard) {
        let reactionsContainer = msgCard.querySelector('.msg-reactions');
        if (!reactionsContainer) {
          reactionsContainer = document.createElement('div');
          reactionsContainer.className = 'msg-reactions';
          msgCard.appendChild(reactionsContainer);
        }
        const badge = document.createElement('span');
        badge.className = 'reaction-badge';
        badge.textContent = `${emoji} ${sender}`;
        reactionsContainer.appendChild(badge);
      }
    });

    this.socket.on('participants-update', (participants) => {
      this.updateRecipientDropdown(participants);
    });
  },

  updateRecipientDropdown(participants) {
    const select = document.getElementById('chat-recipient-select');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">Everyone (Public Chat)</option>';

    participants.forEach((p) => {
      if (p.username !== this.currentUsername) {
        const opt = document.createElement('option');
        opt.value = p.socketId;
        opt.textContent = `🔒 ${p.username} (Private)`;
        select.appendChild(opt);
      }
    });

    select.value = currentVal;
  },

  handleTyping() {
    if (!this.socket) return;
    this.socket.emit('chat-typing', { isTyping: true });

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socket.emit('chat-typing', { isTyping: false });
    }, 1500);
  },

  async sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const text = chatInput.value.trim();
    if (!text || !this.socket || !this.roomId) return;

    try {
      const encryptedPayload = await AppCrypto.encryptText(text, this.roomSecret);
      const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

      this.socket.emit('send-encrypted-message', {
        roomId: this.roomId,
        payload: encryptedPayload,
        targetSocketId: this.selectedRecipientSocketId,
        replyTo: this.replyingToMsg,
        messageId
      });

      chatInput.value = '';
      this.cancelReply();
    } catch (err) {
      console.error('Failed to send encrypted message:', err);
    }
  },

  async renderMessage(msgData) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    let decryptedText = '';
    try {
      decryptedText = await AppCrypto.decryptText(msgData.payload, this.roomSecret);
    } catch (err) {
      decryptedText = '[Encrypted Payload]';
    }

    const isSelf = msgData.sender === this.currentUsername;
    const card = document.createElement('div');
    card.id = `msg-${msgData.id}`;
    card.className = `chat-bubble ${isSelf ? 'self' : 'other'} ${msgData.isPrivate ? 'private-msg' : ''}`;

    let replyHtml = '';
    if (msgData.replyTo) {
      replyHtml = `<div class="reply-quote">↩️ Replying to: <em>${msgData.replyTo.sender}: ${msgData.replyTo.text.substring(0, 30)}...</em></div>`;
    }

    card.innerHTML = `
      <div class="chat-meta">
        <strong>${msgData.sender}</strong>
        <span>${msgData.isPrivate ? '🔒 Private' : '🔒 E2EE'} • ${new Date(msgData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      ${replyHtml}
      <div class="chat-content">${this.escapeHtml(decryptedText)}</div>
      <div class="msg-action-toolbar">
        <button class="msg-action-btn btn-react" title="Add Reaction">😊</button>
        <button class="msg-action-btn btn-reply" title="Reply">↩️</button>
        <button class="msg-action-btn btn-copy" title="Copy Text">📋</button>
      </div>
    `;

    // Action handlers
    card.querySelector('.btn-reply').addEventListener('click', () => {
      this.setReply({ sender: msgData.sender, text: decryptedText });
    });

    card.querySelector('.btn-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(decryptedText);
      alert('Message copied to clipboard!');
    });

    card.querySelector('.btn-react').addEventListener('click', () => {
      const emoji = prompt('Enter Reaction Emoji (❤️, 👍, 😂, 🎉, 😮):', '👍');
      if (emoji) {
        this.socket.emit('chat-reaction', { messageId: msgData.id, emoji });
      }
    });

    chatMessages.appendChild(card);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Log to AI transcript assistant
    if (this.socket) {
      this.socket.emit('log-transcript', { text: decryptedText });
    }
  },

  setReply(replyObj) {
    this.replyingToMsg = replyObj;
    const bar = document.getElementById('chat-reply-bar');
    const textEl = document.getElementById('reply-target-text');
    if (bar && textEl) {
      textEl.textContent = `${replyObj.sender}: ${replyObj.text}`;
      bar.style.display = 'flex';
    }
  },

  cancelReply() {
    this.replyingToMsg = null;
    const bar = document.getElementById('chat-reply-bar');
    if (bar) bar.style.display = 'none';
  },

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

window.AppChat = AppChat;
