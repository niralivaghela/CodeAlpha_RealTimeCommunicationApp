import React from 'react';
import {
  Home,
  Calendar,
  Users,
  MessageSquare,
  FolderOpen,
  Edit3,
  Star,
  Settings,
  LogOut,
  Video,
  ChevronRight,
} from 'lucide-react';
import { getInitials, getAvatarGradient } from '../utils/avatar';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'meetings', label: 'Meetings', icon: Calendar },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'whiteboards', label: 'Whiteboards', icon: Edit3 },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const DesktopSidebar = ({
  activeTab = 'home',
  onSelectTab,
  user,
  onOpenProfile,
  onLogout,
}) => {
  const initials = getInitials(user?.name);
  const gradient = getAvatarGradient(user?.name);

  return (
    <aside className="w-64 h-full bg-slate-950 dark:bg-slate-950 light:bg-white border-r border-white/10 dark:border-white/10 light:border-slate-200 flex flex-col justify-between select-none z-30 flex-shrink-0 transition-colors duration-200">
      {/* Top Branding */}
      <div>
        <div className="p-5 border-b border-white/10 dark:border-white/10 light:border-slate-200 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-brand-500/25 border border-white/20">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-white dark:text-white light:text-slate-900 text-base tracking-tight">
                NEXORA
              </span>
              <span className="font-light text-cyan-400 text-base tracking-wider">
                CONNECT
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Enterprise Collaboration
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab && onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white dark:group-hover:text-white light:group-hover:text-slate-900'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Profile & Status */}
      <div className="p-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 bg-slate-900/40 dark:bg-slate-900/40 light:bg-slate-50">
        <div
          onClick={onOpenProfile}
          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-200/60 transition-colors cursor-pointer group"
          title="Edit Profile"
        >
          {/* Avatar with live online dot */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center border border-white/20 shadow-md group-hover:scale-105 transition-transform`}
            >
              {initials}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                user?.presence === 'available'
                  ? 'bg-emerald-500'
                  : user?.presence === 'away'
                  ? 'bg-amber-500'
                  : user?.presence === 'busy'
                  ? 'bg-rose-500'
                  : 'bg-slate-500'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white dark:text-white light:text-slate-900 truncate">
                {user?.name || 'User'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-emerald-400 font-medium capitalize">
                {user?.presence || 'Online'}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Quick Logout Button */}
        <button
          onClick={onLogout}
          className="w-full mt-2 flex items-center justify-center space-x-2 py-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
