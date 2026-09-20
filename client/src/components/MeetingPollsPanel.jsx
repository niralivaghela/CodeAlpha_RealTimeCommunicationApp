import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, CheckCircle2, X, Users } from 'lucide-react';
import { meetingAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const MeetingPollsPanel = ({ meetingId, isHost, onClose }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [polls, setPolls] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  // Fetch existing polls from MongoDB
  const fetchPolls = async () => {
    try {
      const res = await meetingAPI.getPolls(meetingId);
      if (res.data?.polls) {
        setPolls(res.data.polls);
      }
    } catch (err) {
      console.warn('Failed to fetch polls:', err.message);
    }
  };

  useEffect(() => {
    if (meetingId) fetchPolls();
  }, [meetingId]);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    const handlePollCreated = (poll) => {
      setPolls((prev) => [poll, ...prev]);
    };
    const handlePollUpdated = (poll) => {
      setPolls((prev) => prev.map((p) => (p.pollId === poll.pollId ? poll : p)));
    };

    socket.on('meeting-poll-created', handlePollCreated);
    socket.on('meeting-poll-updated', handlePollUpdated);

    return () => {
      socket.off('meeting-poll-created', handlePollCreated);
      socket.off('meeting-poll-updated', handlePollUpdated);
    };
  }, [socket]);

  // Create Poll
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    try {
      const res = await meetingAPI.createPoll(meetingId, {
        question: question.trim(),
        options: validOptions,
      });
      if (res.data?.poll) {
        setPolls((prev) => [res.data.poll, ...prev]);
        if (socket) {
          socket.emit('meeting-poll-create', { meetingId, poll: res.data.poll });
        }
        setQuestion('');
        setOptions(['', '']);
        setIsCreating(false);
      }
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  // Vote on Poll
  const handleVote = async (pollId, optionId) => {
    try {
      const res = await meetingAPI.votePoll(meetingId, pollId, optionId);
      if (res.data?.poll) {
        setPolls((prev) => prev.map((p) => (p.pollId === pollId ? res.data.poll : p)));
        if (socket) {
          socket.emit('meeting-poll-vote', { meetingId, poll: res.data.poll });
        }
      }
    } catch (err) {
      console.error('Failed to record vote:', err);
    }
  };

  const addOptionField = () => {
    if (options.length < 5) setOptions([...options, '']);
  };

  const currentUserId = (user?.id || user?._id || '').toString();

  return (
    <div className="h-full flex flex-col bg-slate-900/90 dark:bg-slate-900/90 light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 border-l border-white/10 dark:border-white/10 light:border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-white/10 dark:border-white/10 light:border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900">
              Meeting Polls
            </h3>
            <p className="text-[10px] text-slate-400">Live audience voting and sentiment</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>New Poll</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Creation Form */}
        {isCreating && (
          <form
            onSubmit={handleCreatePoll}
            className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">Create a New Poll</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                required
                className="w-full bg-slate-950/60 dark:bg-slate-950/60 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-300 rounded-lg px-3 py-1.5 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              {options.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const copy = [...options];
                    copy[idx] = e.target.value;
                    setOptions(copy);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  required
                  className="w-full bg-slate-950/60 dark:bg-slate-950/60 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-300 rounded-lg px-3 py-1 text-xs text-white dark:text-white light:text-slate-900 placeholder-slate-500 focus:outline-none"
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              {options.length < 5 && (
                <button
                  type="button"
                  onClick={addOptionField}
                  className="text-[11px] text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Option</span>
                </button>
              )}
              <button
                type="submit"
                className="ml-auto px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
              >
                Launch Poll
              </button>
            </div>
          </form>
        )}

        {/* Existing Polls List */}
        {polls.length === 0 && !isCreating ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No active polls. Click "New Poll" above to start a live vote.
          </div>
        ) : (
          polls.map((poll) => {
            const totalVotes = poll.options.reduce(
              (acc, opt) => acc + (opt.votes ? opt.votes.length : 0),
              0
            );

            return (
              <div
                key={poll.pollId}
                className="p-4 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 leading-snug">
                    {poll.question}
                  </h4>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1 flex-shrink-0 ml-2">
                    <Users className="w-3 h-3" />
                    <span>{totalVotes} votes</span>
                  </span>
                </div>

                <div className="space-y-2">
                  {poll.options.map((opt) => {
                    const voteCount = opt.votes ? opt.votes.length : 0;
                    const percent =
                      totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const hasVoted = opt.votes && opt.votes.includes(currentUserId);

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleVote(poll.pollId, opt.id)}
                        className={`w-full text-left p-2 rounded-lg border transition-all relative overflow-hidden group ${
                          hasVoted
                            ? 'border-indigo-500/60 bg-indigo-500/15'
                            : 'border-white/5 dark:border-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-white hover:border-white/20'
                        }`}
                      >
                        {/* Fill bar */}
                        <div
                          className="absolute inset-y-0 left-0 bg-indigo-500/20 transition-all duration-300 pointer-events-none"
                          style={{ width: `${percent}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-200 dark:text-slate-200 light:text-slate-800 flex items-center space-x-1.5">
                            {hasVoted && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                            <span>{opt.text}</span>
                          </span>
                          <span className="font-bold font-mono text-[11px] text-slate-400">
                            {percent}% ({voteCount})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MeetingPollsPanel;
