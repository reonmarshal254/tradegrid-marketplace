import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner } from '../../components/Ui';
import { StarIcon, TrendingUpIcon, HeartIcon, EyeIcon, TagIcon, UserIcon } from '../../components/Icons';
import { formatPrice } from '../../utils/format';

export default function AdminInsightsPage() {
  const [insights, setInsights] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, insightsRes] = await Promise.all([
        api.admin.stats(),
        api.admin.insights()
      ]);
      setStats(statsRes.stats);
      setInsights(insightsRes.insights || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout stats={stats}>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  const { topItems = [], topSellers = [], topCategories = [], growth = {} } = insights;

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Insights & Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              Platform performance and trends
            </p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  period === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p === '7d' && 'Last 7 Days'}
                {p === '30d' && 'Last 30 Days'}
                {p === '90d' && 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <UserIcon className="w-6 h-6 opacity-80" />
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">User Growth</p>
            <p className="text-3xl font-bold mt-1">
              +{growth.users || 0}
            </p>
            <p className="text-xs opacity-75 mt-1">new users this period</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TagIcon className="w-6 h-6 opacity-80" />
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">Items Posted</p>
            <p className="text-3xl font-bold mt-1">
              +{growth.items || 0}
            </p>
            <p className="text-xs opacity-75 mt-1">new listings this period</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <StarIcon className="w-6 h-6 opacity-80" />
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">Items Sold</p>
            <p className="text-3xl font-bold mt-1">
              {growth.sold || 0}
            </p>
            <p className="text-xs opacity-75 mt-1">successful sales</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <EyeIcon className="w-6 h-6 opacity-80" />
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <p className="text-sm opacity-90">Total Views</p>
            <p className="text-3xl font-bold mt-1">
              {growth.views || 0}
            </p>
            <p className="text-xs opacity-75 mt-1">item views this period</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <StarIcon className="w-5 h-5 text-amber-500" />
              Top Performing Items
            </h2>
            {topItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {topItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                      {idx + 1}
                    </span>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.views || 0} views</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Sellers */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-500" />
              Top Sellers
            </h2>
            {topSellers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {topSellers.map((seller, idx) => (
                  <div key={seller.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{seller.name}</p>
                      <p className="text-xs text-gray-500">
                        {seller.total_items || 0} items • {seller.total_sales || 0} sold
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">
                      {formatPrice(seller.total_revenue || 0)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-green-500" />
            Popular Categories
          </h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data available</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topCategories.map((cat) => (
                <div key={cat.category} className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                  <p className="font-semibold text-gray-900 capitalize mb-1">{cat.category}</p>
                  <p className="text-2xl font-bold text-indigo-600">{cat.count || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">items listed</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
