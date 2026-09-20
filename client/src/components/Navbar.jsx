import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getInitials, getAvatarGradient } from '../utils/avatar';
import ProfileModal from './ProfileModal';
import {
  Video,
  LogOut,
  User,
  WifiOff,
  Bell,
  Search,
  Settings,
  Shield,
  ChevronDown,
} from 'lucide-react';

const Navbar = ({ onOpenProfile }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { connectionStatus, isConnected } = useSocket();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = getInitials(user?.name);
  const gradient = getAvatarGradient(user?.name);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 glass-panel select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand */}
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform duration-200 border border-white/20">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent tracking-tight">
                  Nexora Connect
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30 uppercase tracking-wider">
                  Pro
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-400 font-medium tracking-tight -mt-0.5">
                Connect. Collaborate. Communicate.
              </p>
            </div>
          </Link>

          {/* Center / Search bar (desktop) */}
          <div className="hidden lg:flex items-center w-72 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search meetings..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Right: Status, Notifications, Profile */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Live Connection Pill */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 animate-spin" />
                  <span>{connectionStatus}</span>
                </>
              )}
            </div>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel border border-white/10 shadow-2xl p-3 text-xs z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                    <span className="font-bold text-white">Notifications</span>
                    <span className="text-[10px] text-slate-400">1 new</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 space-y-1">
                    <p className="text-white font-medium">RealConnect Ready</p>
                    <p className="text-slate-400 text-[11px]">
                      WebRTC peer mesh and collaborative tools are operational.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            {isAuthenticated && user && (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2.5 p-1.5 pl-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <div
                    className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${gradient} text-white flex items-center justify-center font-bold text-xs shadow-sm`}
                  >
                    {initials}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-[100px]">
                    {user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel border border-white/10 shadow-2xl p-2 z-50 animate-fadeIn">
                    <div className="p-3 border-b border-white/10 mb-1">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowProfileModal(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 flex items-center space-x-2 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-brand-400" />
                      <span>Account Profile</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </>
  );
};

export default Navbar;
