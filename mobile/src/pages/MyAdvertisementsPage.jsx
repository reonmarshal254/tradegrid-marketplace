import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { EyeIcon, PlusIcon, ChartIcon, ClockIcon, CheckCircleIcon, XCircleIcon, PauseIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';

export default function MyAdvertisementsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedAd, setSelectedAd] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadAds();
  }, [user, navigate]);

  async function loadAds() {
    setLoading(true);
    try {
      const response = await api.advertisements.list();
      setAds(response.advertisements || []);
    } catch (error) {
      console.error('Failed to load advertisements:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAds = ads.filter(ad => {
    if (filter === 'all') return true;
    return ad.status === filter;
  });

  const stats = {
    total: ads.length,
    pending: ads.filter(ad => ad.status === 'pending').length,
    approved: ads.filter(ad => ad.status === 'approved').length,
    rejected: ads.filter(ad => ad.status === 'rejected').length,
    paused: ads.filter(ad => ad.status === 'paused').length,
    totalViews: ads.reduce((sum, ad) => sum + (ad.views_count || 0), 0),
    totalClicks: ads.reduce((sum, ad) => sum + (ad.clicks_count || 0), 0),
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'paused': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      case 'approved': return <CheckCircleIcon className="w-4 h-4" />;
      case 'rejected': return <XCircleIcon className="w-4 h-4" />;
      case 'paused': return <PauseIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Spinner className="h-10 w-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Advertisements</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and track your advertisement campaigns</p>
        </div>
        <Link
          to="/advertisements/create"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-indigo-500/30"
        >
          <PlusIcon className="w-5 h-5" />
          Create New Ad
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Ads</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
              📢
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <EyeIcon className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center text-xl">
              👆
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg CTR</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalViews > 0 ? ((stats.totalClicks / stats.totalViews) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <ChartIcon className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: stats.total },
              { key: 'approved', label: 'Approved', count: stats.approved },
              { key: 'pending', label: 'Pending Review', count: stats.pending },
              { key: 'rejected', label: 'Rejected', count: stats.rejected },
              { key: 'paused', label: 'Paused', count: stats.paused },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filter === f.key
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* Ads List */}
        <div className="divide-y divide-gray-50">
          {filteredAds.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📢</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'No advertisements yet' : `No ${filter} advertisements`}
              </h3>
              <p className="text-gray-500 mb-6">
                {filter === 'all' 
                  ? 'Create your first advertisement to reach more customers'
                  : `You don't have any ${filter} advertisements`
                }
              </p>
              {filter === 'all' && (
                <Link
                  to="/advertisements/create"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create Your First Ad
                </Link>
              )}
            </div>
          ) : (
            filteredAds.map((ad) => (
              <div key={ad.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start gap-4">
                  {/* Media Preview */}
                  <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden shrink-0">
                    {ad.banner_url ? (
                      <img src={ad.banner_url} alt={ad.title} className="w-full h-full object-cover" />
                    ) : ad.video_url ? (
                      <video src={ad.video_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Media
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{ad.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ad.description}</p>
                      </div>
                      <span className={`ml-4 px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusColor(ad.status)}`}>
                        {getStatusIcon(ad.status)}
                        {ad.status}
                      </span>
                    </div>

                    {/* Rejection Reason */}
                    {ad.status === 'rejected' && ad.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {ad.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <EyeIcon className="w-4 h-4" />
                        <span className="font-medium">{ad.views_count || 0}</span>
                        <span>views</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{ad.clicks_count || 0}</span>
                        <span>clicks</span>
                      </div>
                      {ad.views_count > 0 && (
                        <div className="flex items-center gap-1.5">
                          <ChartIcon className="w-4 h-4" />
                          <span className="font-medium">
                            {((ad.clicks_count / ad.views_count) * 100).toFixed(1)}%
                          </span>
                          <span>CTR</span>
                        </div>
                      )}
                      <div className="text-gray-400">•</div>
                      <span>Created {timeAgo(ad.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => setSelectedAd(ad)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-300 hover:border-indigo-400 px-4 py-2 rounded-lg transition"
                      >
                        View Details
                      </button>
                      {ad.link_url && (
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg transition"
                        >
                          Visit Link →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Advertisement Details</h3>
                <button
                  onClick={() => setSelectedAd(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {/* Media Display */}
              <div className="mb-6">
                {selectedAd.banner_url && (
                  <img 
                    src={selectedAd.banner_url} 
                    alt={selectedAd.title}
                    className="w-full h-80 object-cover rounded-xl"
                  />
                )}
                {selectedAd.video_url && (
                  <video 
                    src={selectedAd.video_url}
                    controls
                    className="w-full h-80 object-cover rounded-xl"
                  />
                )}
              </div>

              {/* Status Badge */}
              <div className="mb-6">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedAd.status)}`}>
                  {getStatusIcon(selectedAd.status)}
                  Status: {selectedAd.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg mb-2">{selectedAd.title}</h4>
                  <p className="text-gray-600">{selectedAd.description}</p>
                </div>

                {selectedAd.status === 'rejected' && selectedAd.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h5 className="font-semibold text-red-900 mb-2">Rejection Reason:</h5>
                    <p className="text-red-800">{selectedAd.rejection_reason}</p>
                    <p className="text-sm text-red-600 mt-3">
                      Please create a new advertisement that addresses the above concerns or contact support for clarification.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Target Audience:</span>
                    <p className="text-gray-600">{selectedAd.target_audience || 'All users'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Budget:</span>
                    <p className="text-gray-600">
                      {selectedAd.budget_amount ? `KES ${Number(selectedAd.budget_amount).toLocaleString()}` : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <p className="text-gray-600">{new Date(selectedAd.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Last Updated:</span>
                    <p className="text-gray-600">{new Date(selectedAd.updated_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedAd.link_url && (
                  <div>
                    <span className="font-medium text-gray-700">Website Link:</span>
                    <a 
                      href={selectedAd.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 break-all block mt-1"
                    >
                      {selectedAd.link_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Performance Analytics */}
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-6 border border-indigo-100">
                <h5 className="font-semibold text-gray-900 mb-4">📊 Performance Analytics</h5>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{selectedAd.views_count || 0}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{selectedAd.clicks_count || 0}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Clicks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {selectedAd.views_count > 0 
                        ? ((selectedAd.clicks_count / selectedAd.views_count) * 100).toFixed(1) 
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Click-Through Rate</div>
                  </div>
                </div>

                {selectedAd.status === 'approved' && selectedAd.views_count === 0 && (
                  <p className="text-sm text-gray-600 text-center mt-4">
                    Your ad is live! Analytics will appear once users start viewing it.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
