import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { TrendingUpIcon, EyeIcon, TagIcon, HeartIcon, MessageCircleIcon, CurrencyIcon } from '../components/Icons';
import { Link } from 'react-router-dom';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // days
  const [data, setData] = useState({
    overview: {},
    items: [],
    advertisements: [],
    performance: {}
  });

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, period]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const [itemsRes, adsRes, overviewRes] = await Promise.all([
        api.items.myStats(),
        api.advertisements.getMyAds(),
        api.analytics.overview({ period })
      ]);

      // Process advertisement analytics
      const adAnalytics = await Promise.all(
        adsRes.advertisements.slice(0, 5).map(async (ad) => {
          try {
            const analytics = await api.advertisements.getAnalytics(ad.id);
            return { ...ad, analytics: analytics.analytics };
          } catch {
            return { ...ad, analytics: [] };
          }
        })
      );

      setData({
        overview: overviewRes || {},
        items: itemsRes.items || [],
        advertisements: adAnalytics,
        performance: itemsRes.stats || {}
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Login Required</h1>
        <p className="mt-2 text-sm text-gray-500">Please log in to view analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  const canAccessAnalytics = ['recommended', 'enterprise'].includes(user.subscription_plan);

  if (!canAccessAnalytics) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center bg-white rounded-2xl border border-gray-200 p-12">
          <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-6">
            📊
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics Dashboard</h1>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get detailed insights into your listings performance, advertisement metrics, and business growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              <TrendingUpIcon className="w-5 h-5" />
              Upgrade to Access Analytics
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Available with Recommended and Enterprise plans
          </p>
        </div>
      </div>
    );
  }

  const totalViews = data.items.reduce((sum, item) => sum + (item.views_count || 0), 0);
  const totalReactions = data.items.reduce((sum, item) => sum + (item.reactions_count || 0), 0);
  const totalAdViews = data.advertisements.reduce((sum, ad) => sum + (ad.views_count || 0), 0);
  const totalAdClicks = data.advertisements.reduce((sum, ad) => sum + (ad.clicks_count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Track your performance and grow your business</p>
        </div>
        
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-green-600">+12% from last period</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <EyeIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Items</p>
              <p className="text-2xl font-bold text-gray-900">{data.performance.active || 0}</p>
              <p className="text-xs text-blue-600">
                {data.performance.total || 0} total listings
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <TagIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reactions</p>
              <p className="text-2xl font-bold text-gray-900">{totalReactions.toLocaleString()}</p>
              <p className="text-xs text-pink-600">Engagement rate: {
                totalViews > 0 ? ((totalReactions / totalViews) * 100).toFixed(1) : 0
              }%</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
              <HeartIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ad Impressions</p>
              <p className="text-2xl font-bold text-gray-900">{totalAdViews.toLocaleString()}</p>
              <p className="text-xs text-purple-600">
                {totalAdClicks} clicks (CTR: {totalAdViews > 0 ? ((totalAdClicks / totalAdViews) * 100).toFixed(1) : 0}%)
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <TrendingUpIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performing Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Items</h3>
          
          {data.items.length > 0 ? (
            <div className="space-y-4">
              {data.items
                .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
                .slice(0, 5)
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                    <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                      {item.images?.[0]?.url ? (
                        <img src={item.images[0].url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-gray-600">KES {item.price?.toLocaleString()}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{item.views_count || 0} views</p>
                      <p className="text-xs text-gray-500">{item.reactions_count || 0} reactions</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No items to display</p>
            </div>
          )}
        </div>

        {/* Advertisement Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Advertisement Performance</h3>
            <Link
              to="/advertise"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Create Ad
            </Link>
          </div>
          
          {data.advertisements.length > 0 ? (
            <div className="space-y-4">
              {data.advertisements.map((ad) => (
                <div key={ad.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{ad.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ad.status === 'approved' ? 'bg-green-100 text-green-700' :
                      ad.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {ad.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Views</p>
                      <p className="font-semibold">{ad.views_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Clicks</p>
                      <p className="font-semibold">{ad.clicks_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">CTR</p>
                      <p className="font-semibold">
                        {ad.views_count > 0 ? ((ad.clicks_count / ad.views_count) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUpIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="mb-2">No advertisements yet</p>
              <Link
                to="/advertise"
                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
              >
                Create your first ad
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold mb-4">💡 Performance Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Improve Visibility</h4>
            <p className="text-indigo-100">Add high-quality photos and detailed descriptions to get more views.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Boost Engagement</h4>
            <p className="text-indigo-100">Feature your best items and respond quickly to buyer messages.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Grow Your Reach</h4>
            <p className="text-indigo-100">Create targeted advertisements to reach more potential buyers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}