import React, { useState, useEffect } from 'react';
import { HelpCircle, ThumbsUp, CheckCircle, Plus, X, Send } from 'lucide-react';
import { meetingAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const MeetingQnAPanel = ({ meetingId, isHost, onClose }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');

  const fetchQuestions = async () => {
    try {
      const res = await meetingAPI.getQnA(meetingId);
      if (res.data?.qna) {
        setQuestions(res.data.qna);
      }
    } catch (err) {
      console.warn('Failed to fetch Q&A:', err.message);
    }
  };

  useEffect(() => {
    if (meetingId) fetchQuestions();
  }, [meetingId]);

  useEffect(() => {
    if (!socket) return;
    const handleCreated = (q) => {
      setQuestions((prev) => [q, ...prev]);
    };
    const handleUpdated = (q) => {
      setQuestions((prev) => prev.map((item) => (item.questionId === q.questionId ? q : item)));
    };

    socket.on('meeting-qna-created', handleCreated);
    socket.on('meeting-qna-updated', handleUpdated);

    return () => {
      socket.off('meeting-qna-created', handleCreated);
      socket.off('meeting-qna-updated', handleUpdated);
    };
  }, [socket]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      const res = await meetingAPI.createQuestion(meetingId, newQuestion.trim());
      if (res.data?.question) {
        setQuestions((prev) => [res.data.question, ...prev]);
        if (socket) {
          socket.emit('meeting-qna-create', { meetingId, question: res.data.question });
        }
        setNewQuestion('');
      }
    } catch (err) {
      console.error('Failed to post question:', err);
    }
  };

  const handleUpvote = async (questionId) => {
    try {
      const res = await meetingAPI.upvoteQuestion(meetingId, questionId);
      if (res.data?.question) {
        setQuestions((prev) =>
          prev.map((item) => (item.questionId === questionId ? res.data.question : item))
        );
        if (socket) {
          socket.emit('meeting-qna-update', { meetingId, question: res.data.question });
        }
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  const handleToggleAnswer = async (questionId) => {
    if (!isHost) return;
    try {
      const res = await meetingAPI.answerQuestion(meetingId, questionId);
      if (res.data?.question) {
        setQuestions((prev) =>
          prev.map((item) => (item.questionId === questionId ? res.data.question : item))
        );
        if (socket) {
          socket.emit('meeting-qna-update', { meetingId, question: res.data.question });
        }
      }
    } catch (err) {
      console.error('Failed to toggle answer:', err);
    }
  };

  const currentUserId = (user?.id || user?._id || '').toString();

  // Sort by upvote count descending
  const sortedQuestions = [...questions].sort(
    (a, b) => (b.upvotes ? b.upvotes.length : 0) - (a.upvotes ? a.upvotes.length : 0)
  );

  return (
    <div className="h-full flex flex-col bg-slate-900/90 dark:bg-slate-900/90 light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 border-l border-white/10 dark:border-white/10 light:border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-white/10 dark:border-white/10 light:border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900">
              Q&A Panel
            </h3>
            <p className="text-[10px] text-slate-400">Audience questions & upvoting</p>
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

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedQuestions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No questions asked yet. Be the first to ask below!
          </div>
        ) : (
          sortedQuestions.map((q) => {
            const upvoteCount = q.upvotes ? q.upvotes.length : 0;
            const hasUpvoted = q.upvotes && q.upvotes.includes(currentUserId);

            return (
              <div
                key={q.questionId}
                className={`p-3.5 rounded-xl border transition-all ${
                  q.answered
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-white/10 dark:border-white/10 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-100 dark:text-slate-100 light:text-slate-800 leading-relaxed">
                      {q.question}
                    </p>
                    <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-400">
                      <span>Asked by {q.userName || 'Anonymous'}</span>
                      {q.answered && (
                        <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          <span>Answered</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    <button
                      onClick={() => handleUpvote(q.questionId)}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold transition-colors flex items-center space-x-1 ${
                        hasUpvoted
                          ? 'border-indigo-500 bg-indigo-600 text-white'
                          : 'border-white/10 hover:border-white/20 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{upvoteCount}</span>
                    </button>

                    {isHost && (
                      <button
                        onClick={() => handleToggleAnswer(q.questionId)}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                          q.answered
                            ? 'text-slate-400 hover:text-white'
                            : 'text-emerald-400 hover:underline'
                        }`}
                      >
                        {q.answered ? 'Mark Unanswered' : 'Mark Answered'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ask Input */}
      <form
        onSubmit={handleAskQuestion}
        className="p-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex items-center space-x-2"
      >
        <input
          type="text"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-slate-950/60 dark:bg-slate-950/60 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 rounded-xl px-3.5 py-2 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newQuestion.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default MeetingQnAPanel;
