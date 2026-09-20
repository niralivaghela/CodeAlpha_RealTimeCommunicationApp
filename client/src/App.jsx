import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import DesktopTitleBar from './components/DesktopTitleBar';
import OfflineBanner from './components/OfflineBanner';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MeetingRoomPage from './pages/MeetingRoomPage';
import { Loader2 } from 'lucide-react';

const DeepLinkListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onDeepLink) {
      window.electronAPI.onDeepLink((meetingId) => {
        if (meetingId) {
          navigate(`/meeting/${meetingId.trim().toUpperCase()}`);
        }
      });
    }
  }, [navigate]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Verifying Nexora session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Loading Nexora Connect...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-hidden select-none">
            {/* Frameless Desktop Titlebar */}
            <DesktopTitleBar />
          {/* Server Disconnect / Offline Banner */}
          <OfflineBanner />

          <div className="flex-1 overflow-hidden relative flex flex-col">
            <BrowserRouter>
              <DeepLinkListener />
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/meeting/:id"
                  element={
                    <ProtectedRoute>
                      <MeetingRoomPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </div>
        </div>
      </SocketProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
