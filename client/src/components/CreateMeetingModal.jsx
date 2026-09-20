import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingAPI } from '../services/api';
import {
  Plus,
  X,
  Copy,
  Check,
  Share2,
  ArrowRight,
  Shield,
  Mic,
  Video,
  Loader2,
  Calendar,
} from 'lucide-react';

const CreateMeetingModal = ({ onClose, onMeetingCreated }) => {
  const [title, setTitle] = useState('');
  const [allowBeforeHost, setAllowBeforeHost] = useState(true);
  const [requireAuth, setRequireAuth] = useState(true);
  const [muteOnEntry, setMuteOnEntry] = useState(false);
  const [cameraOffOnEntry, setCameraOffOnEntry] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const options = {
        allowBeforeHost,
        requireAuth,
        muteOnEntry,
        cameraOffOnEntry,
      };

      const res = await meetingAPI.createMeeting(title || 'Instant Meeting', options);
      setCreatedMeeting(res.data.meeting);
      if (onMeetingCreated) onMeetingCreated();
    } catch (err) {
      console.error('Create meeting error:', err);
      setError('Failed to create meeting room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyMeetingId = () => {
    if (createdMeeting?.meetingId) {
      navigator.clipboard.writeText(createdMeeting.meetingId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const copyMeetingLink = () => {
    if (createdMeeting?.meetingId) {
      const link = `${window.location.origin}/meeting/${createdMeeting.meetingId}`;
      navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareMeeting = async () => {
    if (createdMeeting?.meetingId) {
      const link = `${window.location.origin}/meeting/${createdMeeting.meetingId}`;
      const deepLink = `nexora://meeting/${createdMeeting.meetingId}`;
      const inviteText = `Join my Nexora Connect meeting\nMeeting ID: ${createdMeeting.meetingId}\nWeb Link: ${link}\nDesktop: ${deepLink}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Nexora Connect Meeting',
            text: inviteText,
            url: link,
          });
          setShared(true);
          setTimeout(() => setShared(false), 2000);
          return;
        } catch (e) {}
      }

      navigator.clipboard.writeText(inviteText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const meetingUrl = createdMeeting
    ? `${window.location.origin}/meeting/${createdMeeting.meetingId}`
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {!createdMeeting ? (
          <div>
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-brand-600/30 text-brand-300 flex items-center justify-center border border-brand-500/30">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create New Meeting</h2>
                <p className="text-xs text-slate-400">Configure room security and participant settings</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Meeting Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design Sync & WebRTC Review"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-slate-300 block">Meeting Security & Options</span>

                <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={allowBeforeHost}
                    onChange={(e) => setAllowBeforeHost(e.target.checked)}
                    className="rounded border-white/20 bg-slate-950 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Allow participants to join before host</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={requireAuth}
                    onChange={(e) => setRequireAuth(e.target.checked)}
                    className="rounded border-white/20 bg-slate-950 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Require user authentication</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={muteOnEntry}
                    onChange={(e) => setMuteOnEntry(e.target.checked)}
                    className="rounded border-white/20 bg-slate-950 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Mute participant microphones on entry</span>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={cameraOffOnEntry}
                    onChange={(e) => setCameraOffOnEntry(e.target.checked)}
                    className="rounded border-white/20 bg-slate-950 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Turn participant cameras off on entry</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-brand-500/25 flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Room...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Meeting</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Meeting Created Success State */
          <div className="text-center py-2 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <Check className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Meeting created successfully</h3>
            <p className="text-xs text-slate-400 mb-5">
              Your meeting room is active and ready for participants.
            </p>

            {/* Meeting ID Card */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 mb-3 text-left">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Meeting ID
              </span>
              <span className="text-xl font-mono font-black text-indigo-300 tracking-wider">
                {createdMeeting.meetingId}
              </span>
            </div>

            {/* Meeting Link Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 mb-5 text-left flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">
                  Meeting link
                </span>
                <span className="text-xs text-slate-300 font-mono truncate block">
                  {meetingUrl}
                </span>
              </div>
            </div>

            {/* Action Buttons Grid: Copy Meeting ID, Copy Link, Share */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <button
                onClick={copyMeetingId}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-colors text-xs font-semibold flex items-center justify-center space-x-1.5 border border-white/10"
                title="Copy Meeting ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? 'Copied!' : 'Copy Meeting ID'}</span>
              </button>

              <button
                onClick={copyMeetingLink}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-colors text-xs font-semibold flex items-center justify-center space-x-1.5 border border-white/10"
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={shareMeeting}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-colors text-xs font-semibold flex items-center justify-center space-x-1.5 border border-white/10"
                title="Share Meeting"
              >
                {shared ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{shared ? 'Shared!' : 'Share'}</span>
              </button>
            </div>

            {/* Join Now Primary Action */}
            <button
              onClick={() => navigate(`/meeting/${createdMeeting.meetingId}`)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Join Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateMeetingModal;
