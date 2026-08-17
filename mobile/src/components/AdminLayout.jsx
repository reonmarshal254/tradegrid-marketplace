import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  ShieldIcon,
  UserIcon,
  TagIcon,
  AlertIcon,
  StarIcon,
  ChatIcon,
  LogoutIcon,
  BellIcon,
  CloseIcon,
  HeadsetIcon,
  CreditCardIcon,
  MegaphoneIcon,
  UploadIcon,
} from './Icons';

const MENU_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <ShieldIcon className="w-5 h-5" />,
    path: '/admin',
  },
  {
    id: 'users',
    label: 'Users',
    icon: <UserIcon className="w-5 h-5" />,
    path: '/admin/users',
  },
  {
    id: 'items',
    label: 'Items',
    icon: <TagIcon className="w-5 h-5" />,
    path: '/admin/items',
  },
  {
    id: 'advertisements',
    label: 'Advertisements',
    icon: <MegaphoneIcon className="w-5 h-5" />,
    path: '/admin/advertisements',
    badge: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <AlertIcon className="w-5 h-5" />,
    path: '/admin/reports',
    badge: true,
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: <StarIcon className="w-5 h-5" />,
    path: '/admin/insights',
  },
  {
    id: 'support',
    label: 'Support',
    icon: <ChatIcon className="w-5 h-5" />,
    path: '/admin/support',
    badge: true,
  },
  {
    id: 'live-chat',
    label: 'Live Chats',
    icon: <ChatIcon className="w-5 h-5" />,
    path: '/admin/support-chat',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: <BellIcon className="w-5 h-5" />,
    path: '/admin/announcements',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: <CreditCardIcon className="w-5 h-5" />,
    path: '/admin/subscription-settings',
  },
  {
    id: 'app-versions',
    label: 'App Versions',
    icon: <UploadIcon className="w-5 h-5" />,
    path: '/admin/app-versions',
  },
];

export default function AdminLayout({ children, stats }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const getBadgeCount = (id) => {
    if (id === 'reports') return stats?.open_reports || 0;
    if (id === 'support') return stats?.open_support || 0;
    if (id === 'advertisements') return stats?.pending_ads || 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-indigo-600 to-violet-600 border-b border-indigo-700 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Logo */}
              <Link to="/admin" className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ShieldIcon className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-white font-bold text-lg">Admin Panel</h1>
                  <p className="text-indigo-200 text-xs -mt-0.5">TRADEGRID Marketplace</p>
                </div>
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                className="relative p-2 rounded-lg text-white hover:bg-white/10 transition"
                aria-label="Notifications"
              >
                <BellIcon className="w-5 h-5" />
                {(stats?.open_reports > 0 || stats?.open_support > 0) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-indigo-600" />
                )}
              </button>

              {/* Back to site */}
              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Back to Site
              </Link>

              {/* User menu */}
              <div className="flex items-center gap-3 pl-3 border-l border-white/20">
                <div className="hidden sm:block text-right">
                  <p className="text-white text-sm font-semibold">{user?.name}</p>
                  <p className="text-indigo-200 text-xs">Administrator</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-white hover:bg-white/10 transition"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogoutIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto py-6">
          <nav className="px-3 space-y-1">
            {MENU_ITEMS.map((item) => {
              const active = isActive(item.path);
              const badgeCount = item.badge ? getBadgeCount(item.id) : 0;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {badgeCount > 0 && (
                    <span
                      className={`min-w-[24px] h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center ${
                        active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Stats */}
          <div className="mt-8 mx-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-3">
              Quick Stats
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Users</span>
                <span className="text-sm font-bold text-gray-900">{stats?.total_users || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Items</span>
                <span className="text-sm font-bold text-gray-900">{stats?.active_items || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Open Reports</span>
                <span className="text-sm font-bold text-red-600">{stats?.open_reports || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64 pt-16">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
