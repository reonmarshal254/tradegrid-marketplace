import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationSocket } from '../context/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner, EmptyState } from '../components/Ui';
import { BellIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { refreshUnread } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Real-time notification updates via WebSocket
  useNotificationSocket((notification) => {
    setNotifications((prev) => {
      // Add to top, avoid duplicates
      if (prev.some(n => n.id === notification.id)) return prev;
      return [notification, ...prev];
    });
    refreshUnread();
  });

  async function load(page = 1) {
    setLoading(true);
    try {
      const data = await api.notifications.list(page);
      setNotifications((prev) => (page === 1 ? data.notifications : [...prev, ...data.notifications]));
      setPagination(data.pagination);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  async function markAllRead() {
    try {
      await api.notifications.readAll();
      setNotifications((n) => n.map((x) => ({ ...x, read_at: new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  }

  function openNotification(n) {
    api.notifications.read(n.id).catch(() => {});
    setNotifications((list) =>
      list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    );
    if (n.data?.item_id) navigate(`/item/${n.data.item_id}`);
  }

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 divide-y divide-gray-100">
        {loading && notifications.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<BellIcon className="h-10 w-10" />}
            title="No notifications yet"
            message="When someone reacts to your items, or new activity happens, you'll see it here."
          />
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => openNotification(n)}
              className={`w-full text-left px-5 py-4 hover:bg-gray-50 flex gap-4 transition ${
                n.read_at ? '' : 'bg-indigo-50/50'
              }`}
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  n.read_at ? 'bg-gray-200' : 'bg-indigo-500'
                }`}
              />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-gray-900 text-sm">{n.title}</span>
                <span className="block text-sm text-gray-500 mt-0.5">{n.body}</span>
                <span className="block text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</span>
              </span>
            </button>
          ))
        )}
      </div>

      {pagination && pagination.page < pagination.total_pages && (
        <div className="mt-6 text-center">
          <button
            onClick={() => load(pagination.page + 1)}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
