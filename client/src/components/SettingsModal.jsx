import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  X,
  Mic,
  Video,
  Volume2,
  Keyboard,
  Sun,
  Moon,
  Monitor,
  Activity,
  CheckCircle2,
  Wifi,
  Shield,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { systemAPI } from '../services/api';

const SettingsModal = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'appearance' | 'diagnostics' | 'shortcuts'
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [speakerDevices, setSpeakerDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedSpeakerDevice, setSelectedSpeakerDevice] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio processing constraints
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);

  // System Diagnostics
  const [healthData, setHealthData] = useState(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const previewRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vList = devices.filter((d) => d.kind === 'videoinput');
        const aList = devices.filter((d) => d.kind === 'audioinput');
        const sList = devices.filter((d) => d.kind === 'audiooutput');

        setVideoDevices(vList);
        setAudioDevices(aList);
        setSpeakerDevices(sList);
        if (vList.length > 0) setSelectedVideoDevice(vList[0].deviceId);
        if (aList.length > 0) setSelectedAudioDevice(aList[0].deviceId);
        if (sList.length > 0) setSelectedSpeakerDevice(sList[0].deviceId);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation, noiseSuppression, autoGainControl },
          video: true,
        });
        streamRef.current = stream;
        if (previewRef.current) previewRef.current.srcObject = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);

          const buffer = new Uint8Array(analyser.frequencyBinCount);
          const loop = () => {
            analyser.getByteFrequencyData(buffer);
            let sum = 0;
            for (let i = 0; i < buffer.length; i++) sum += buffer[i];
            setAudioLevel(Math.min(100, Math.round((sum / buffer.length / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(loop);
          };
          loop();
        }
      } catch (err) {
        console.warn('Settings modal media init:', err);
      }
    };

    init();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [echoCancellation, noiseSuppression, autoGainControl]);

  // Load health data when opening diagnostics tab
  useEffect(() => {
    if (activeTab === 'diagnostics') {
      setIsLoadingHealth(true);
      systemAPI
        .getHealth()
        .then((res) => {
          setHealthData(res.data);
        })
        .catch((err) => {
          console.warn('Diagnostics fetch failed:', err.message);
        })
        .finally(() => setIsLoadingHealth(false));
    }
  }, [activeTab]);

  const playSpeakerTestTone = () => {
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
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-xl glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 dark:border-white/10 light:border-slate-300 dark:bg-slate-900/95 light:bg-white shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-base font-bold text-white dark:text-white light:text-slate-900 mb-4">
          Preferences & Settings
        </h2>

        {/* Tabs */}
        <div className="flex items-center space-x-2 border-b border-white/10 dark:border-white/10 light:border-slate-200 pb-3 mb-5 overflow-x-auto text-xs">
          {[
            { id: 'devices', label: 'Audio & Video', icon: Settings },
            { id: 'appearance', label: 'Appearance', icon: Sun },
            { id: 'diagnostics', label: 'System Health', icon: Activity },
            { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-all flex-shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* TAB 1: DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="relative w-full aspect-video max-h-44 rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
                <video
                  ref={previewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
                  Camera Device
                </label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                  className="w-full bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-xl px-3 py-2 text-xs text-white dark:text-white light:text-slate-900 focus:outline-none"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
                  Microphone Device
                </label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                  className="w-full bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-xl px-3 py-2 text-xs text-white dark:text-white light:text-slate-900 focus:outline-none"
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>

                <div className="mt-2 flex items-center space-x-2 text-[11px] text-slate-400">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Input Level:</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 mb-1">
                  Speaker Device
                </label>
                <select
                  value={selectedSpeakerDevice}
                  onChange={(e) => setSelectedSpeakerDevice(e.target.value)}
                  className="w-full bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-300 rounded-xl px-3 py-2 text-xs text-white dark:text-white light:text-slate-900 focus:outline-none"
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
                  onClick={playSpeakerTestTone}
                  className="mt-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Test Speaker (Play Chime)</span>
                </button>
              </div>

              {/* Audio Constraints Toggles */}
              <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200">
                <span className="block text-xs font-semibold text-slate-300 dark:text-slate-300 light:text-slate-700 mb-2">
                  Audio Processing Filters
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEchoCancellation(!echoCancellation)}
                    className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                      echoCancellation
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/5 bg-white/5 text-slate-500'
                    }`}
                  >
                    Echo Cancellation
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                      noiseSuppression
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/5 bg-white/5 text-slate-500'
                    }`}
                  >
                    Noise Suppression
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoGainControl(!autoGainControl)}
                    className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                      autoGainControl
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/5 bg-white/5 text-slate-500'
                    }`}
                  >
                    Auto Gain Control
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 mb-1">
                  Interface Theme
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">
                  Select your preferred desktop appearance or follow your Windows preference.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light', icon: Sun, desc: 'Clean white surfaces' },
                    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Deep slate & navy' },
                    { id: 'system', label: 'System', icon: Monitor, desc: 'Follow Windows OS' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTheme(item.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600/15 shadow-md shadow-indigo-600/20'
                            : 'border-white/10 dark:border-white/10 light:border-slate-200 hover:border-white/20 bg-white/5 dark:bg-white/5 light:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl w-fit mb-3 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white dark:text-white light:text-slate-900">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              {isLoadingHealth ? (
                <div className="py-12 flex items-center justify-center text-slate-500 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
                  Inspecting cluster telemetry...
                </div>
              ) : healthData ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-300 dark:text-slate-300 light:text-slate-700">
                        Database Engine
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        {healthData.services?.database?.status || 'Healthy'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Host: {healthData.services?.database?.host} • State:{' '}
                      {healthData.services?.database?.connectionState}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-300 dark:text-slate-300 light:text-slate-700">
                        Node.js Runtime & Memory
                      </span>
                      <span className="font-mono text-cyan-400 font-bold text-[11px]">
                        {healthData.system?.memoryUsageMb} MB Heap
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Node: {healthData.system?.nodeVersion} • Platform: {healthData.system?.platform} • Uptime:{' '}
                      {healthData.uptimeSeconds}s
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 dark:border-white/10 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-300 dark:text-slate-300 light:text-slate-700">
                        Signaling Protocol
                      </span>
                      <span className="text-emerald-400 font-bold text-[10px]">Connected</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Socket.IO v4 binary buffer transport enabled with 20MB payload capacity.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Health telemetry unavailable.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Use global and in-meeting keyboard shortcuts for rapid action:
              </p>

              <div className="space-y-1.5 text-xs">
                {[
                  { key: 'Ctrl + K', action: 'Open Command Palette' },
                  { key: 'M', action: 'Mute / Unmute Microphone' },
                  { key: 'C', action: 'Turn Camera On / Off' },
                  { key: 'S', action: 'Toggle Screen Sharing' },
                  { key: 'H', action: 'Raise / Lower Hand' },
                  { key: 'R', action: 'Open Reaction Bar' },
                  { key: 'P', action: 'Toggle Participant List' },
                  { key: 'B', action: 'Open Collaborative Whiteboard' },
                  { key: 'Esc', action: 'Close Open Panel / Modal' },
                ].map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200"
                  >
                    <span className="text-slate-200 dark:text-slate-200 light:text-slate-800">
                      {s.action}
                    </span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-200 border border-white/20 dark:border-white/20 light:border-slate-300 font-mono font-bold text-indigo-400 dark:text-indigo-400 light:text-indigo-600 text-[11px]">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
