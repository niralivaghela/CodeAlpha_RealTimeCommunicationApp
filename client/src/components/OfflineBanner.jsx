import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const OfflineBanner = () => {
  const { isConnected, connectionStatus } = useSocket();
  const [isRetrying, setIsRetrying] = useState(false);

  if (isConnected) return null;

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  return (
    <div className="w-full bg-rose-500/20 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between z-40 select-none animate-fadeIn text-xs">
      <div className="flex items-center space-x-2 text-rose-300">
        <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span className="font-semibold">Unable to connect to Nexora server.</span>
        <span className="hidden sm:inline text-rose-400">
          (Status: {connectionStatus}) — Check network or backend connection.
        </span>
      </div>

      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] flex items-center space-x-1.5 transition-all shadow-md shadow-rose-600/30 disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? 'Reconnecting...' : 'Retry'}</span>
      </button>
    </div>
  );
};

export default OfflineBanner;
