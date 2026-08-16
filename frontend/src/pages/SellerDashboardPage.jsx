import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/Ui';
import { Stars } from '../components/Ui';
import { TagIcon, HeartIcon, ClockIcon, CheckCircleIcon, StarIcon, PlusIcon, TrendingUpIcon, AlertIcon } from '../components/Icons';

const STAT_CARDS = [
  { key: 'total_listings', label: 'Total listings', icon: <TagIcon className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-600' },
  { key: 'active_listings', label: 'Active items', icon: <ClockIcon className="w-5 h-5" />, color: 'bg-green-100 text-green-600' },
  { key: 'sold_listings', label: 'Items sold', icon: <CheckCircleIcon className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600' },
  { key: 'total_reactions', label: 'Total reactions', icon: <HeartIcon className="w-5 h-5" />, color: 'bg-red-100 text-red-500' },
];

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user can create ads (Recommended or Enterprise plan)
  const canCreateAds = ['recommended', 'enterprise'].includes(user?.subscription_plan);
  const isSubscriptionExpired = user?.subscription_expires_at && new Date(user.subscription_expires_at) < new Date();

  const handleCreateAd = () => {
    if (!canCreateAds || isSubscriptionExpired) {
      navigate('/pricing');
    } else {
      navigate('/advertise');
    }
  };

  useEffect(() => {
    api.items
      .myStats()
      .then((data) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Seller dashboard</h1>
          <p className="text-sm text-gray-500">Your selling performance at a glance</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/post"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition"
          >
            <PlusIcon className="w-4 h-4" /> Post new item
          </Link>
          <button
            onClick={handleCreateAd}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full transition ${
              canCreateAds && !isSubscriptionExpired
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
            }`}
          >
            <TrendingUpIcon className="w-4 h-4" />
            {canCreateAds && !isSubscriptionExpired ? 'Create Ad' : 'Create Ad (Premium)'}
          </button>
        </div>
      </div>

      {/* Premium Feature Notice for Free Users */}
      {(!canCreateAds || isSubscriptionExpired) && (
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <TrendingUpIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Unlock Advertisement Features</h3>
              <p className="mt-1 text-sm text-gray-600">
                Upgrade to <span className="font-semibold">Recommended</span> or <span className="font-semibold">Enterprise</span> plan to create targeted advertisements, reach more buyers, and track your ad performance with detailed analytics.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg"
                >
                  <StarIcon className="w-4 h-4" filled />
                  View Pricing Plans
                </Link>
                <Link
                  to="/my-profile"
                  className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-sm"
                >
                  Manage Subscription →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="bg-white rounded-2xl border border-gray-200 p-5">
            <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.color}`}>
              {card.icon}
            </span>
            <p className="mt-3 text-3xl font-extrabold text-gray-900">{stats[card.key]}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-3xl font-extrabold text-gray-900">{stats.total_views}</p>
          <p className="text-sm text-gray-500">Profile / item views</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-3xl font-extrabold text-gray-900">{stats.total_purchases}</p>
          <p className="text-sm text-gray-500">Confirmed purchases</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-1.5">
            <StarIcon className="w-5 h-5 text-amber-400" filled />
            <p className="text-3xl font-extrabold text-gray-900">
              {stats.rating_avg !== null ? stats.rating_avg : '—'}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            {stats.review_count} review{stats.review_count === 1 ? '' : 's'}
          </p>
          <Stars value={stats.rating_avg} size="w-3.5 h-3.5" className="mt-1 text-amber-400" />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/my-items"
          className="inline-flex items-center bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition"
        >
          Manage my items
        </Link>
        <Link
          to="/activity-log"
          className="inline-flex items-center border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-full transition"
        >
          View activity log
        </Link>
      </div>
    </div>
  );
}
