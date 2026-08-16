import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner, Avatar } from '../../components/Ui';
import { SearchIcon, CheckCircleIcon, TrashIcon } from '../../components/Icons';
import { timeAgo } from '../../utils/format';

// Plan badge colors
const PLAN_STYLES = {
  free: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Free' },
  personal: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Personal' },
  recommended: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Recommended', icon: '⭐' },
  enterprise: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Enterprise', icon: '👑' },
};

export default function AdminUsersPage() {
  const { refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [notification, setNotification] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(''), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.admin.stats(),
        api.admin.users(),
      ]);
      setStats(statsRes.stats);
      setUsers(usersRes.users);
    } catch (err) {
      setNotification(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(fn, message) {
    setBusy(true);
    try {
      await fn();
      setNotification(message);
      await loadData();
      refreshUser();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage users, roles, and permissions</p>
          </div>
        </div>

        {notification && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm px-4 py-3 rounded-xl">
            {notification}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{filteredUsers.length} users</span>
              {busy && <span className="text-indigo-600">Working...</span>}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Spinner className="h-10 w-10" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Last Login</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={{ name: u.name, avatar_url: u.avatar_url }} size="h-10 w-10" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 flex items-center gap-2 truncate">
                              {u.name}
                              {u.is_verified && (
                                <CheckCircleIcon className="w-5 h-5 text-green-500 shrink-0 drop-shadow-sm" title="Verified" />
                              )}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const plan = u.subscription_plan || 'free';
                          const style = PLAN_STYLES[plan] || PLAN_STYLES.free;
                          const isExpired = u.subscription_expires_at && new Date(u.subscription_expires_at) < new Date();
                          
                          return (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${style.bg} ${style.text}`}>
                                {style.icon && <span>{style.icon}</span>}
                                {style.label}
                              </span>
                              {u.subscription_expires_at && (
                                <span className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                  {isExpired ? '⚠️ Expired' : `Until ${new Date(u.subscription_expires_at).toLocaleDateString()}`}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                              u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Deactivated'}
                          </span>
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.rating_avg != null ? `${u.rating_avg} (${u.rating_count})` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.item_count}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              handleAction(
                                () => api.admin.updateUser(u.id, { is_verified: !u.is_verified }),
                                'User updated'
                              )
                            }
                            disabled={busy}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition"
                          >
                            {u.is_verified ? 'Unverify' : 'Verify'}
                          </button>
                          <button
                            onClick={() =>
                              handleAction(
                                () => api.admin.updateUser(u.id, { is_active: !u.is_active }),
                                'User updated'
                              )
                            }
                            disabled={busy}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition"
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() =>
                              handleAction(
                                () =>
                                  api.admin.updateUser(u.id, {
                                    role: u.role === 'admin' ? 'user' : 'admin',
                                  }),
                                'Role updated'
                              )
                            }
                            disabled={busy}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition whitespace-nowrap"
                          >
                            {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete ${u.name} permanently? This also removes their items, reviews and reports.`
                                )
                              ) {
                                handleAction(() => api.admin.deleteUser(u.id), 'User deleted');
                              }
                            }}
                            disabled={busy}
                            className="p-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                            title="Delete user"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
