import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api';
import { Avatar, Spinner } from './Ui';
import { BellIcon, PlusIcon, ChatIcon, ShieldIcon, CloseIcon } from './Icons';
import { timeAgo } from '../utils/format';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/items', label: 'Items' },
  { to: '/categories', label: 'Categories' },
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
  { to: '/contact', label: 'Contact Us' },
];

export default function Navbar() {
  const { user, logout, unreadCount, refreshUnread, msgUnread, refreshMsgUnread } = useAuth();
  const { on, off, connected } = useSocket();
  const location = useLocation();
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const bellRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Real-time notification updates
  useEffect(() => {
    if (!connected || !user) return;

    const handleNewNotification = (notification) => {
      console.log('[navbar] new notification:', notification);
      setNotifications((prev) => {
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev.slice(0, 7)]; // Keep top 8
      });
      refreshUnread();
    };

    const handleNewMessage = () => {
      refreshMsgUnread();
    };

    on('notification:new', handleNewNotification);
    on('message:new_unread', handleNewMessage);

    return () => {
      off('notification:new', handleNewNotification);
      off('message:new_unread', handleNewMessage);
    };
  }, [on, off, connected, user, refreshUnread, refreshMsgUnread]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setBellOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  async function openBell() {
    setBellOpen((open) => {
      const next = !open;
      if (next) loadNotifications();
      return next;
    });
  }

  async function loadNotifications() {
    setLoadingNotifs(true);
    try {
      const data = await api.notifications.list(1);
      setNotifications(data.notifications.slice(0, 8));
    } catch {
      /* ignore */
    } finally {
      setLoadingNotifs(false);
    }
  }

  async function markAllRead() {
    try {
      await api.notifications.readAll();
      setNotifications((n) => n.map((x) => ({ ...x, read_at: new Date().toISOString() })));
      refreshUnread();
    } catch {
      /* ignore */
    }
  }

  function goToNotification(n) {
    setBellOpen(false);
    const id = n.data?.item_id;
    if (id) navigate(`/item/${id}`);
    else navigate('/notifications');
  }

  function isActive(path) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  const iconBtn =
    'relative p-2 rounded-full text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all duration-200';

  const desktopNav = (
    <nav className="hidden lg:flex items-center gap-1">
      {NAV_LINKS.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className={`relative px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            isActive(l.to)
              ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25'
              : 'text-gray-700 hover:text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-white/85 backdrop-blur-xl shadow-sm border-gray-200/70'
          : 'bg-white/60 backdrop-blur-lg border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 lg:h-[4.25rem] flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
            TG
          </span>
          <span className="hidden sm:block text-lg font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            TRADEGRID
          </span>
        </Link>

        <div className="flex-1 flex justify-center">{desktopNav}</div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            to="/post"
            className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <PlusIcon className="w-4 h-4" /> Sell an item
          </Link>

          {user ? (
            <>
              <Link to="/chat" className={iconBtn} aria-label="Messages">
                <ChatIcon className="w-6 h-6" />
                {msgUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center animate-pop">
                    {msgUnread > 99 ? '99+' : msgUnread}
                  </span>
                )}
              </Link>

              <div className="relative" ref={bellRef}>
                <button onClick={openBell} className={iconBtn} aria-label="Notifications">
                  <BellIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pop">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl shadow-gray-900/10 ring-1 ring-black/5 overflow-hidden animate-dropdown">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-semibold text-sm">Notifications</span>
                      {notifications.some((n) => !n.read_at) && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifs ? (
                        <div className="flex justify-center py-8">
                          <Spinner />
                        </div>
                      ) : notifications.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => goToNotification(n)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 transition ${
                              n.read_at ? 'opacity-70' : ''
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                n.read_at ? 'bg-gray-200' : 'bg-indigo-500'
                              }`}
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-gray-900">
                                {n.title}
                              </span>
                              <span className="block text-sm text-gray-500 line-clamp-2">
                                {n.body}
                              </span>
                              <span className="block text-xs text-gray-400 mt-0.5">
                                {timeAgo(n.created_at)}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <Link
                      to="/notifications"
                      onClick={() => setBellOpen(false)}
                      className="block text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50 py-3 border-t border-gray-100 transition"
                    >
                      View all notifications
                    </Link>
                  </div>
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Account menu"
                  className={`rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
                    menuOpen ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                  }`}
                >
                  <Avatar user={user} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl shadow-gray-900/10 ring-1 ring-black/5 py-2 animate-dropdown">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/my-items"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      My items
                    </Link>
                    <Link
                      to="/my-profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 transition bg-indigo-50/50"
                    >
                      💎 My Profile
                    </Link>
                    <Link
                      to="/my-ads"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      📢 My Advertisements
                    </Link>
                    <Link
                      to="/affiliate"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition"
                    >
                      💰 Affiliate program
                    </Link>
                    <Link
                      to="/favorites"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      Favorites
                    </Link>
                    <Link
                      to="/recently-viewed"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      Recently viewed
                    </Link>
                    <Link
                      to="/seller-dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      Seller dashboard
                    </Link>
                    <Link
                      to="/search-history"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      Search history
                    </Link>
                    <Link
                      to="/activity-log"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      Activity log
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      Settings
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition"
                      >
                        <ShieldIcon className="w-4 h-4" /> Admin dashboard
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      Profile settings
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-gray-700 hover:text-indigo-700 px-3.5 py-2 rounded-full hover:bg-indigo-50 transition-all duration-200"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-full hover:-translate-y-0.5 active:translate-y-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                Sign up
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Menu"
          >
            <span
              className={`block w-6 h-6 transition-transform duration-300 ${
                mobileOpen ? 'rotate-90' : ''
              }`}
            >
              {mobileOpen ? (
                <CloseIcon className="w-6 h-6 text-gray-700" />
              ) : (
                <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-200/70 bg-white/95 backdrop-blur-xl animate-fade-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                style={{ animationDelay: `${i * 35}ms` }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition animate-fade-up ${
                  isActive(l.to)
                    ? 'text-white bg-gradient-to-r from-indigo-600 to-violet-600'
                    : 'text-gray-700 hover:bg-indigo-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-gray-100 my-2" />
            {user ? (
              <Link
                to="/post"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-center shadow-md shadow-indigo-500/25"
              >
                Sell an item
              </Link>
            ) : (
              <div className="flex flex-col gap-1">
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 text-center"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white text-center"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
