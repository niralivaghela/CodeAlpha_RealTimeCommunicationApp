import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Check,
  CheckCheck,
  Smile,
  User,
  Search,
  Loader2,
} from 'lucide-react';
import { directMessageAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getInitials, getAvatarGradient } from '../utils/avatar';

const DirectMessagesPanel = ({ initialPartner = null }) => {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(initialPartner);
  const [messages, setMessages] = useState([]);
  const [inputContent, setInputContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch conversations list
  const fetchConversations = async () => {
    try {
      const res = await directMessageAPI.getConversations();
      if (res.data?.conversations) {
        setConversations(res.data.conversations);
        if (!activePartner && res.data.conversations.length > 0 && !initialPartner) {
          setActivePartner(res.data.conversations[0].user);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err.message);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (initialPartner) {
      setActivePartner(initialPartner);
    }
  }, [initialPartner]);

  // 2. Fetch messages for active partner
  const fetchMessages = async (partnerId) => {
    if (!partnerId) return;
    setIsLoading(true);
    try {
      const res = await directMessageAPI.getMessages(partnerId);
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.warn('Failed to fetch messages:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activePartner) {
      fetchMessages(activePartner.id || activePartner._id);
    }
  }, [activePartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // 3. Socket real-time listeners for DMs
  useEffect(() => {
    if (!socket) return;

    const handleDmReceived = (dm) => {
      const partnerId = activePartner ? (activePartner.id || activePartner._id) : null;
      if (
        partnerId &&
        (dm.senderId === partnerId || dm.recipientId === partnerId)
      ) {
        setMessages((prev) => [...prev, dm]);
      }
      fetchConversations();
    };

    const handleTyping = ({ senderId, isTyping: typingState }) => {
      const partnerId = activePartner ? (activePartner.id || activePartner._id) : null;
      if (partnerId && senderId === partnerId) {
        setPartnerTyping(typingState);
      }
    };

    const handlePresence = ({ userId, presence }) => {
      setConversations((prev) =>
        prev.map((c) =>
          (c.user.id || c.user._id) === userId ? { ...c, user: { ...c.user, presence } } : c
        )
      );
      if (activePartner && (activePartner.id || activePartner._id) === userId) {
        setActivePartner((prev) => ({ ...prev, presence }));
      }
    };

    socket.on('dm-received', handleDmReceived);
    socket.on('dm-typing-indicator', handleTyping);
    socket.on('presence-updated', handlePresence);

    return () => {
      socket.off('dm-received', handleDmReceived);
      socket.off('dm-typing-indicator', handleTyping);
      socket.off('presence-updated', handlePresence);
    };
  }, [socket, activePartner]);

  // 4. Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() || !activePartner) return;

    const partnerId = activePartner.id || activePartner._id;
    const content = inputContent.trim();
    setInputContent('');

    // Emit stop typing
    if (socket) {
      socket.emit('dm-typing', {
        recipientId: partnerId,
        senderId: currentUser.id || currentUser._id,
        senderName: currentUser.name,
        isTyping: false,
      });
    }

    try {
      const res = await directMessageAPI.sendMessage(partnerId, content);
      if (res.data?.directMessage) {
        setMessages((prev) => [...prev, res.data.directMessage]);

        // Broadcast to recipient socket
        if (socket) {
          socket.emit('dm-send', {
            recipientId: partnerId,
            directMessage: res.data.directMessage,
          });
        }
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send DM:', err);
    }
  };

  // 5. Handle Typing Indicator
  const handleInputChange = (e) => {
    setInputContent(e.target.value);
    if (!socket || !activePartner) return;

    const partnerId = activePartner.id || activePartner._id;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('dm-typing', {
        recipientId: partnerId,
        senderId: currentUser.id || currentUser._id,
        senderName: currentUser.name,
        isTyping: true,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('dm-typing', {
        recipientId: partnerId,
        senderId: currentUser.id || currentUser._id,
        senderName: currentUser.name,
        isTyping: false,
      });
    }, 1500);
  };

  // 6. Delete own message
  const handleDeleteMessage = async (messageId) => {
    try {
      await directMessageAPI.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => (m.id || m._id) !== messageId));
    } catch (err) {
      console.warn('Failed to delete message:', err.message);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex overflow-hidden rounded-2xl glass-panel border border-white/10 dark:border-white/10 light:border-slate-300">
      {/* Left Sidebar: Conversation List */}
      <div className="w-72 border-r border-white/10 dark:border-white/10 light:border-slate-200 flex flex-col bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-50">
        <div className="p-3.5 border-b border-white/10 dark:border-white/10 light:border-slate-200">
          <h3 className="text-sm font-bold text-white dark:text-white light:text-slate-900 mb-2">
            Direct Messages
          </h3>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900/60 dark:bg-slate-900/60 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No direct message threads yet. Search for a contact to begin.
            </div>
          ) : (
            filteredConversations.map((c) => {
              const partner = c.user;
              const isSelected =
                activePartner && (activePartner.id || activePartner._id) === (partner.id || partner._id);
              const initials = getInitials(partner.name);
              const gradient = getAvatarGradient(partner.name);

              return (
                <button
                  key={partner.id || partner._id}
                  onClick={() => setActivePartner(partner)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center space-x-3 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-200/60 text-slate-300 dark:text-slate-300 light:text-slate-700'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center`}
                    >
                      {initials}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                        partner.presence === 'available'
                          ? 'bg-emerald-500'
                          : partner.presence === 'away'
                          ? 'bg-amber-500'
                          : partner.presence === 'busy'
                          ? 'bg-rose-500'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{partner.name}</span>
                      {c.lastMessage && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {c.lastMessage ? c.lastMessage.content : 'No messages yet'}
                    </p>
                  </div>

                  {c.unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Active Message Thread */}
      <div className="flex-1 flex flex-col bg-slate-950/20 dark:bg-slate-950/20 light:bg-white">
        {activePartner ? (
          <>
            {/* Thread Header */}
            <div className="p-3.5 border-b border-white/10 dark:border-white/10 light:border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${getAvatarGradient(
                      activePartner.name
                    )} text-white font-bold text-xs flex items-center justify-center`}
                  >
                    {getInitials(activePartner.name)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                      activePartner.presence === 'available'
                        ? 'bg-emerald-500'
                        : activePartner.presence === 'away'
                        ? 'bg-amber-500'
                        : activePartner.presence === 'busy'
                        ? 'bg-rose-500'
                        : 'bg-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white dark:text-white light:text-slate-900">
                    {activePartner.name}
                  </h4>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                    <span className="capitalize">{activePartner.presence || 'Available'}</span>
                    <span>•</span>
                    <span>{activePartner.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
                  Loading message history...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                  <p>No messages yet with {activePartner.name}.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Send a greeting to start chatting!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine =
                    (m.senderId?._id || m.senderId) === (currentUser.id || currentUser._id);
                  return (
                    <div
                      key={m.id || m._id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}
                    >
                      <div className="flex items-center space-x-1.5 max-w-[75%]">
                        {isMine && (
                          <button
                            onClick={() => handleDeleteMessage(m.id || m._id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                            title="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                            isMine
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white/10 dark:bg-white/10 light:bg-slate-100 text-slate-100 dark:text-slate-100 light:text-slate-900 border border-white/5 dark:border-white/5 light:border-slate-200 rounded-bl-none'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 mt-1 px-1 text-[9px] text-slate-500">
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
                          m.read ? (
                            <CheckCheck className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Check className="w-3 h-3 text-slate-500" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {partnerTyping && (
                <div className="flex items-center space-x-2 text-xs text-indigo-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200" />
                  <span className="text-[11px] text-slate-400 ml-1">
                    {activePartner.name} is typing...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputContent}
                onChange={handleInputChange}
                placeholder={`Message ${activePartner.name}...`}
                className="flex-1 bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-xl px-3.5 py-2 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputContent.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <MessageSquare className="w-10 h-10 opacity-20 mb-3" />
            <p className="font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700">
              No conversation selected
            </p>
            <p className="text-slate-500 text-[11px] mt-1">
              Select a conversation on the left or search for a contact.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectMessagesPanel;
