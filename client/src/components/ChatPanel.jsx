import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Clock } from 'lucide-react';
import { messageAPI } from '../services/api';

const ChatPanel = ({ meetingId, user, socket, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Load message history from DB
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await messageAPI.getMeetingMessages(meetingId);
        if (res.data && res.data.messages) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.warn('Failed to load chat history:', err.message);
      }
    };

    if (meetingId) {
      fetchHistory();
    }
  }, [meetingId]);

  // Listen for incoming messages over Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [socket]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !meetingId) return;

    socket.emit('send-message', {
      meetingId,
      senderId: user.id || user._id,
      senderName: user.name,
      message: inputMessage.trim(),
    });

    setInputMessage('');
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full sm:w-96 h-full flex flex-col border-l border-white/10 glass-panel z-30 select-none">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-brand-400" />
          <h3 className="font-semibold text-sm text-white">In-Call Messages</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
            <p className="text-xs font-medium text-slate-400">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">Send a message to start collaborating!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = (user && (msg.senderId === user.id || msg.senderId === user._id)) || msg.senderName === user?.name;

            return (
              <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-brand-500/20'
                      : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="p-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600 transition-all shadow-md shadow-brand-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
