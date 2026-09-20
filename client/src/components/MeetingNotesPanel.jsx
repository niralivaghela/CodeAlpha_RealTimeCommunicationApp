import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Save, Check, Clock, User, X } from 'lucide-react';
import { meetingAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

const MeetingNotesPanel = ({ meetingId, onClose }) => {
  const { socket } = useSocket();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [lastEditor, setLastEditor] = useState('');
  const saveTimeoutRef = useRef(null);

  // 1. Fetch initial notes from MongoDB
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await meetingAPI.getNotes(meetingId);
        if (res.data?.notes) {
          setContent(res.data.notes.content || '');
          if (res.data.notes.updatedAt) setLastSaved(new Date(res.data.notes.updatedAt));
          if (res.data.notes.updatedByName) setLastEditor(res.data.notes.updatedByName);
        }
      } catch (err) {
        console.warn('Failed to load notes:', err.message);
      }
    };
    if (meetingId) fetchNotes();
  }, [meetingId]);

  // 2. Listen for socket notes updates from peers
  useEffect(() => {
    if (!socket) return;
    const handleNotesChanged = (notes) => {
      if (notes) {
        setContent(notes.content || '');
        if (notes.updatedAt) setLastSaved(new Date(notes.updatedAt));
        if (notes.updatedByName) setLastEditor(notes.updatedByName);
      }
    };

    socket.on('meeting-notes-changed', handleNotesChanged);
    return () => socket.off('meeting-notes-changed', handleNotesChanged);
  }, [socket]);

  // 3. Auto-save notes to DB & broadcast via Socket
  const handleContentChange = (e) => {
    const newText = e.target.value;
    setContent(newText);
    setIsSaving(true);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await meetingAPI.updateNotes(meetingId, newText);
        setIsSaving(false);
        setLastSaved(new Date());
        if (socket && res.data?.notes) {
          socket.emit('meeting-notes-update', { meetingId, notes: res.data.notes });
        }
      } catch (err) {
        console.warn('Notes auto-save failed:', err.message);
        setIsSaving(false);
      }
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/90 dark:bg-slate-900/90 light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 border-l border-white/10 dark:border-white/10 light:border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-white/10 dark:border-white/10 light:border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900">
              Meeting Notes
            </h3>
            <p className="text-[10px] text-slate-400">
              {isSaving
                ? 'Syncing changes...'
                : lastSaved
                ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Shared notepad'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Textarea Area */}
      <div className="flex-1 p-4 flex flex-col">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Type collaborative meeting minutes, action items, or checklists here... (All participants can see updates in real-time)"
          className="flex-1 w-full bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-xl p-3.5 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed font-sans"
        />
      </div>

      {/* Footer editor badge */}
      {lastEditor && (
        <div className="px-4 py-2 bg-slate-950/30 dark:bg-slate-950/30 light:bg-slate-100 border-t border-white/5 dark:border-white/5 light:border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Last edited by: {lastEditor}</span>
          <span className="text-emerald-400 flex items-center space-x-1">
            <Check className="w-3 h-3" />
            <span>Synced</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default MeetingNotesPanel;
