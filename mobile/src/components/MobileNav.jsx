import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { HomeIcon, GridIcon, UserIcon, MessageCircleIcon, ArrowDownTrayIcon } from './Icons';

const HIDDEN_PATHS = [
  '/admin',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/google/callback',
  '/onboarding',
];

export function isNavHidden(pathname) {
  return HIDDEN_PATHS.some((p) => pathname.startsWith(p));
}

const TABS = [
  { to: '/', label: 'Home', icon: HomeIcon, match: (p) => p === '/' },
  { to: '/items', label: 'Items', icon: GridIcon, match: (p) => p.startsWith('/items') || p.startsWith('/item') },
  { to: '/profile', label: 'Profile', icon: UserIcon, match: (p) => p.startsWith('/profile') || p.startsWith('/my-') || p.startsWith('/favorites') || p.startsWith('/settings') },
  { to: '/chat', label: 'Chats', icon: MessageCircleIcon, match: (p) => p.startsWith('/chat') },
];

export default function MobileNav({ updateInfo, onShowUpdate }) {
  const { msgUnread } = useAuth();
  const location = useLocation();

  if (isNavHidden(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 pointer-events-none">
      {/* Update button — floats above the nav pill */}
      {updateInfo && (
        <button
          onClick={onShowUpdate}
          className="mx-auto mb-2 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/30 pointer-events-auto active:scale-95 transition-all animate-bounce"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Update to v{updateInfo.versionName}
        </button>
      )}
      <div className="mx-auto max-w-md rounded-full bg-white/95 backdrop-blur-xl shadow-lg ring-1 ring-black/5 p-1.5 flex items-center justify-between gap-1 pointer-events-auto animate-fade-up pill-glow">
        {TABS.map(({ to, label, icon: Icon, match }) => {
          const active = match(location.pathname);
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 flex-1 rounded-full py-1.5 px-1 transition-all duration-200 active:scale-95"
            >
              <span
                className={`relative rounded-full px-5 py-1.5 transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                {to === '/chat' && msgUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {msgUnread > 99 ? '99+' : msgUnread}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-semibold ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
