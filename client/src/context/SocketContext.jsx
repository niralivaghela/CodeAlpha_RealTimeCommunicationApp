import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    });

    s.on('connect', () => {
      setConnectionStatus('Connected');
    });

    s.on('reconnecting', (attempt) => {
      setConnectionStatus(`Reconnecting (attempt ${attempt})...`);
    });

    s.on('reconnect', () => {
      setConnectionStatus('Connected');
    });

    s.on('connect_error', () => {
      setConnectionStatus('Reconnecting...');
    });

    s.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        s.connect();
      }
      setConnectionStatus('Disconnected');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connectionStatus,
        isConnected: connectionStatus === 'Connected',
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
