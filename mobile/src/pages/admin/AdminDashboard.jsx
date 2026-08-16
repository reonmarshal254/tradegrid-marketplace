import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner } from '../../components/Ui';
import {
  UserIcon,
  TagIcon,
  HeartIcon,
  StarIcon,
  AlertIcon,
  ChatIcon,
} from '../../components/Icons';
import { timeAgo } from '../../utils/format';

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <span className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </span>
      <p className="mt-4 text-3xl font-extrabold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.admin.stats(),
        api.admin.activity(),
      ]);
      setStats(statsRes.stats);
      setChart(statsRes.chart || []);
      setActivity(activityRes.activity);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout stats={stats}>
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      </AdminLayout>
    );
  }

  const maxVal = Math.max(1, ...chart.flatMap((d) => [d.signups, d.items]));

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back! Here's what's happening with your marketplace
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            label="Total Users"
            value={stats?.total_users}
            icon={<UserIcon className="w-6 h-6" />}
            color="bg-indigo-100 text-indigo-600"
            sub={`${stats?.active_users || 0} active · ${stats?.verified_users || 0} verified`}
          />
          <StatCard
            label="Total Items"
            value={stats?.total_items}
            icon={<TagIcon className="w-6 h-6" />}
            color="bg-blue-100 text-blue-600"
            sub={`${stats?.active_items || 0} active · ${stats?.sold_items || 0} sold`}
          />
          <StatCard
            label="Reactions"
            value={stats?.total_reactions}
            icon={<HeartIcon className="w-6 h-6" />}
            color="bg-red-100 text-red-500"
            sub={`${stats?.total_purchases || 0} purchases`}
          />
          <StatCard
            label="Reviews"
            value={stats?.total_reviews}
            icon={<StarIcon className="w-6 h-6" />}
            color="bg-amber-100 text-amber-600"
            sub={stats?.avg_rating != null ? `Average ${stats?.avg_rating}/5` : 'No reviews yet'}
          />
          <StatCard
            label="Open Reports"
            value={stats?.open_reports}
            icon={<AlertIcon className="w-6 h-6" />}
            color="bg-red-100 text-red-500"
          />
          <StatCard
            label="Open Support"
            value={stats?.open_support}
            icon={<ChatIcon className="w-6 h-6" />}
            color="bg-amber-100 text-amber-600"
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-1">Last 7 Days</h3>
            <p className="text-sm text-gray-500 mb-6">User signups and items posted</p>
            <div className="flex items-end justify-between gap-2 h-48">
              {chart.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex items-end gap-1 w-full justify-center">
                    <div
                      className="w-3 rounded-t bg-indigo-400 hover:bg-indigo-500 transition-all cursor-pointer"
                      style={{ height: `${(d.signups / maxVal) * 160}px` }}
                      title={`${d.signups} signups`}
                    />
                    <div
                      className="w-3 rounded-t bg-amber-400 hover:bg-amber-500 transition-all cursor-pointer"
                      style={{ height: `${(d.items / maxVal) * 160}px` }}
                      title={`${d.items} items`}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-indigo-400" />
                Signups
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-amber-400" />
                Items posted
              </span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-1">Recent Activity</h3>
            <p className="text-sm text-gray-500 mb-4">Latest actions in your marketplace</p>
            <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto -mx-2">
              {activity.length === 0 && (
                <p className="text-sm text-gray-400 py-8 text-center">No activity yet</p>
              )}
              {activity.slice(0, 20).map((a, i) => (
                <li key={i} className="py-3 px-2 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium uppercase tracking-wide">
                      {a.type.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 line-clamp-2">{a.text}</p>
                      <span className="text-xs text-gray-400 mt-1 block">{timeAgo(a.at)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
