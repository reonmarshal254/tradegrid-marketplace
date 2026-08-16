import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner, Avatar } from '../../components/Ui';
import { EyeIcon, CheckCircleIcon, XCircleIcon, PauseIcon, PlayIcon, TrashIcon } from '../../components/Icons';
import { timeAgo } from '../../utils/format';

export default function AdminAdvertisementsPage() {
  const [stats, setStats] = useState(null);
  const [advertisements, setAdvertisements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected, paused
  const [selectedAd, setSelectedAd] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, adsRes] = await Promise.all([
        api.admin.stats(),
        api.admin.advertisements()
      ]);
      setStats(statsRes.stats);
      setAdvertisements(adsRes.advertisements || []);
    } catch (err) {
      setNotification(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function updateAdStatus(adId, status, rejectionReason = null) {
    if (updating) return;
    
    setUpdating(true);
    try {
      await api.admin.updateAdvertisement(adId, { status, rejection_reason: rejectionReason });
      setNotification(`Advertisement ${status} successfully`);
      setSelectedAd(null);
      await loadData();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function deleteAd(adId) {
    if (!window.confirm('Delete this advertisement permanently?')) return;
    
    setUpdating(true);
    try {
      await api.admin.deleteAdvertisement(adId);
      setNotification('Advertisement deleted successfully');
      setSelectedAd(null);
      await loadData();
    } catch (err) {
      setNotification(err.message);
    } finally {
      setUpdating(false);
    }
  }

  const filteredAds = advertisements.filter(ad => {
    if (filter === 'all') return true;
    return ad.status === filter;
  });

  const pendingCount = advertisements.filter(ad => ad.status === 'pending').length;
  const approvedCount = advertisements.filter(ad => ad.status === 'approved').length;

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advertisement Management</h1>
            <p className="mt-1 text-sm text-gray-500">Review and manage user advertisements</p>
          </div>
        </div>

        {notification && (
          <div className="mb-6 bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm px-4 py-3 rounded-xl">
            {notification}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Ads</p>
                <p className="text-2xl font-bold text-gray-900">{advertisements.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                📢
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                ⏳
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                ✅
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-purple-600">
                  {advertisements.reduce((sum, ad) => sum + (ad.views_count || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <EyeIcon className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', count: advertisements.length },
                { key: 'pending', label: 'Pending', count: pendingCount },
                { key: 'approved', label: 'Approved', count: approvedCount },
                { key: 'rejected', label: 'Rejected', count: advertisements.filter(ad => ad.status === 'rejected').length },
                { key: 'paused', label: 'Paused', count: advertisements.filter(ad => ad.status === 'paused').length }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
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

          {loading ? (
            <div className="flex justify-center py-24">
              <Spinner className="h-10 w-10" />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredAds.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No advertisements found for "{filter}" status
                </div>
              ) : (
                filteredAds.map((ad) => (
                  <div key={ad.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-4">
                      {/* Media Preview */}
                      <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden shrink-0">
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
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 truncate">{ad.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{ad.description}</p>
                            
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Avatar user={{ name: ad.user_name, avatar_url: ad.user_avatar }} size="h-5 w-5" />
                                <span>{ad.user_name}</span>
                              </div>
                              <span>{timeAgo(ad.created_at)}</span>
                              <span>Target: {ad.target_audience}</span>
                              {ad.link_url && (
                                <a 
                                  href={ad.link_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-700"
                                >
                                  Visit Link
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ml-4">
                            <div className="text-right text-sm">
                              <p className="text-gray-900 font-semibold">{ad.views_count || 0} views</p>
                              <p className="text-gray-500">{ad.clicks_count || 0} clicks</p>
                            </div>

                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ad.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              ad.status === 'approved' ? 'bg-green-100 text-green-700' :
                              ad.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {ad.status}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => setSelectedAd(ad)}
                            className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-300 hover:border-indigo-400 rounded-lg transition"
                          >
                            <EyeIcon className="w-3 h-3 inline mr-1" />
                            Review
                          </button>

                          {ad.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateAdStatus(ad.id, 'approved')}
                                disabled={updating}
                                className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-700 border border-green-300 hover:border-green-400 rounded-lg transition disabled:opacity-50"
                              >
                                <CheckCircleIcon className="w-3 h-3 inline mr-1" />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Rejection reason (optional):');
                                  updateAdStatus(ad.id, 'rejected', reason);
                                }}
                                disabled={updating}
                                className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-lg transition disabled:opacity-50"
                              >
                                <XCircleIcon className="w-3 h-3 inline mr-1" />
                                Reject
                              </button>
                            </>
                          )}

                          {ad.status === 'approved' && (
                            <button
                              onClick={() => updateAdStatus(ad.id, 'paused')}
                              disabled={updating}
                              className="px-3 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 border border-amber-300 hover:border-amber-400 rounded-lg transition disabled:opacity-50"
                            >
                              <PauseIcon className="w-3 h-3 inline mr-1" />
                              Pause
                            </button>
                          )}

                          {ad.status === 'paused' && (
                            <button
                              onClick={() => updateAdStatus(ad.id, 'approved')}
                              disabled={updating}
                              className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-700 border border-green-300 hover:border-green-400 rounded-lg transition disabled:opacity-50"
                            >
                              <PlayIcon className="w-3 h-3 inline mr-1" />
                              Resume
                            </button>
                          )}

                          <button
                            onClick={() => deleteAd(ad.id)}
                            disabled={updating}
                            className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-lg transition disabled:opacity-50"
                          >
                            <TrashIcon className="w-3 h-3 inline mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Advertisement Detail Modal */}
        {selectedAd && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Advertisement Review</h3>
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
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}
                  {selectedAd.video_url && (
                    <video 
                      src={selectedAd.video_url}
                      controls
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedAd.title}</h4>
                    <p className="text-gray-600 mt-1">{selectedAd.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Advertiser:</span>
                      <p className="text-gray-600">{selectedAd.user_name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Target Audience:</span>
                      <p className="text-gray-600">{selectedAd.target_audience}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Budget:</span>
                      <p className="text-gray-600">
                        {selectedAd.budget_amount ? `KES ${Number(selectedAd.budget_amount).toLocaleString()}` : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <p className="text-gray-600">{new Date(selectedAd.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {selectedAd.link_url && (
                    <div>
                      <span className="font-medium text-gray-700">Website:</span>
                      <a 
                        href={selectedAd.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 break-all"
                      >
                        {selectedAd.link_url}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedAd.views_count || 0}</p>
                      <p className="text-sm text-gray-500">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{selectedAd.clicks_count || 0}</p>
                      <p className="text-sm text-gray-500">Clicks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedAd.views_count > 0 ? ((selectedAd.clicks_count / selectedAd.views_count) * 100).toFixed(1) : 0}%
                      </p>
                      <p className="text-sm text-gray-500">CTR</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedAd.status === 'pending' && (
                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <button
                      onClick={() => updateAdStatus(selectedAd.id, 'approved')}
                      disabled={updating}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl transition disabled:opacity-50"
                    >
                      {updating ? <Spinner className="h-4 w-4 mx-auto" /> : 'Approve Advertisement'}
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason (optional):');
                        updateAdStatus(selectedAd.id, 'rejected', reason);
                      }}
                      disabled={updating}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl transition disabled:opacity-50"
                    >
                      Reject Advertisement
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}