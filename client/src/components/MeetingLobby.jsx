import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
  ArrowLeft,
  Settings,
  Shield,
  User,
  Volume2,
} from 'lucide-react';

const MeetingLobby = ({
  meetingId,
  meetingDetails,
  user,
  onJoinMeeting,
}) => {
  const navigate = useNavigate();

  const [localStream, setLocalStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  // Device enumeration
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [speakerDevices, setSpeakerDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedSpeakerDevice, setSelectedSpeakerDevice] = useState('');

  const videoPreviewRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // 1. Enumerate devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vInputs = devices.filter((d) => d.kind === 'videoinput');
        const aInputs = devices.filter((d) => d.kind === 'audioinput');
        const sOutputs = devices.filter((d) => d.kind === 'audiooutput');

        setVideoDevices(vInputs);
        setAudioDevices(aInputs);
        setSpeakerDevices(sOutputs);

        if (vInputs.length > 0 && !selectedVideoDevice) setSelectedVideoDevice(vInputs[0].deviceId);
        if (aInputs.length > 0 && !selectedAudioDevice) setSelectedAudioDevice(aInputs[0].deviceId);
        if (sOutputs.length > 0 && !selectedSpeakerDevice) setSelectedSpeakerDevice(sOutputs[0].deviceId);
      } catch (err) {
        console.warn('Enumerate devices error:', err);
      }
    };

    getDevices();
  }, [selectedVideoDevice, selectedAudioDevice, selectedSpeakerDevice]);

  // 2. Start initial media stream for preview
  useEffect(() => {
    let active = true;

    const startPreview = async () => {
      try {
        const constraints = {
          video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        // Set up audio visualizer
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const buffer = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(buffer);
              let sum = 0;
              for (let i = 0; i < buffer.length; i++) {
                sum += buffer[i];
              }
              const avg = sum / buffer.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(checkLevel);
            };
            checkLevel();
          }
        } catch (e) {
          console.warn('AudioContext setup error:', e);
        }
      } catch (err) {
        console.warn('Lobby media preview failed:', err);
        setIsCameraOn(false);
      }
    };

    startPreview();

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Toggle Camera
  const toggleCamera = () => {
    if (localStream) {
      const vTracks = localStream.getVideoTracks();
      if (vTracks.length > 0) {
        vTracks[0].enabled = !isCameraOn;
      }
    }
    setIsCameraOn(!isCameraOn);
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStream) {
      const aTracks = localStream.getAudioTracks();
      if (aTracks.length > 0) {
        aTracks[0].enabled = !isMicOn;
      }
    }
    setIsMicOn(!isMicOn);
  };

  const handleJoin = () => {
    // Stop the temporary lobby preview stream so useWebRTC can acquire the selected tracks cleanly
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }

    onJoinMeeting({
      isMuted: !isMicOn,
      isCameraOff: !isCameraOn,
      selectedVideoDevice,
      selectedAudioDevice,
      selectedSpeakerDevice,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Session (DTLS-SRTP)</span>
        </div>
      </div>

      {/* Main Center Area: Camera Preview & Joining Card */}
      <div className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Interactive Media Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video max-h-[380px] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex items-center justify-center">
            {/* Video element */}
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
                isCameraOn ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
              }`}
            />

            {/* Camera Off Placeholder */}
            {!isCameraOn && (
              <div className="flex flex-col items-center justify-center text-center p-6 select-none">
                <div className="w-20 h-20 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-2xl mb-3 border border-indigo-500/30">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <p className="text-sm font-semibold text-slate-300">Camera is off</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click below to turn camera back on</p>
              </div>
            )}

            {/* Floating Quick Controls on Video */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 px-4 py-2 rounded-2xl glass-dock border border-white/10">
              <button
                onClick={toggleMic}
                className={`p-3 rounded-xl transition-all ${
                  isMicOn
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic className="w-5 h-5 text-emerald-400" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleCamera}
                className={`p-3 rounded-xl transition-all ${
                  isCameraOn
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                }`}
                title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isCameraOn ? <Video className="w-5 h-5 text-indigo-400" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Audio Input Level Meter */}
          <div className="w-full max-w-sm mt-4 flex items-center space-x-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
            <Volume2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-400 w-16">Mic Level:</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                style={{ width: `${isMicOn ? audioLevel : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Meeting Info & Join Action */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider block mb-1">
                Meeting Pre-Join Lobby
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {meetingDetails?.title || 'Ready to join?'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Host: <span className="text-slate-300 font-medium">{meetingDetails?.hostName || 'Organizer'}</span>
              </p>
            </div>

            {/* Meeting Details Pill */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Meeting ID</span>
                <span className="text-xs font-mono font-bold text-indigo-300 tracking-wider">
                  {meetingId}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Joining as</span>
                <span className="text-slate-200 font-semibold">{user?.name}</span>
              </div>
            </div>

            {/* Device Selectors */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Camera
                </label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Microphone
                </label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Speaker
                </label>
                <select
                  value={selectedSpeakerDevice}
                  onChange={(e) => setSelectedSpeakerDevice(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {speakerDevices.length > 0 ? (
                    speakerDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Speaker ${d.deviceId.substring(0, 5)}`}
                      </option>
                    ))
                  ) : (
                    <option value="">Default System Speaker</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                      const osc = audioCtx.createOscillator();
                      const gain = audioCtx.createGain();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
                      osc.connect(gain);
                      gain.connect(audioCtx.destination);
                      osc.start();
                      osc.stop(audioCtx.currentTime + 0.8);
                    } catch (e) {
                      console.warn('Audio chime error:', e);
                    }
                  }}
                  className="mt-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1 transition-colors"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Test Speaker (Play Chime)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col space-y-2.5">
            <button
              onClick={handleJoin}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all group"
            >
              <span>Join Now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto text-center text-[11px] text-slate-500">
        Nexora Connect Desktop Platform • "Connect. Collaborate. Communicate."
      </div>
    </div>
  );
};

export default MeetingLobby;
