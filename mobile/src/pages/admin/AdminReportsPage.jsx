import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner, EmptyState } from '../../components/Ui';
import { AlertIcon, CheckCircleIcon } from '../../components/Icons';
import { timeAgo } from '../../utils/format';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, resolved, all

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, reportsRes] = await Promise.all([
        api.admin.stats(),
        api.admin.reports()
      ]);
      setStats(statsRes.stats);
      setReports(reportsRes.reports || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id) {
    try {
      await api.admin.resolveReport(id);
      setReports(reports.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage user reports
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-red-100 text-red-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['pending', 'resolved', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon={<AlertIcon className="w-12 h-12" />}
            title="No reports found"
            message={filter === 'pending' ? 'All caught up! No pending reports.' : 'No reports match your filter.'}
          />
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className={`bg-white rounded-xl border-2 p-6 transition ${
                  report.status === 'pending'
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertIcon className={`w-5 h-5 ${report.status === 'pending' ? 'text-red-600' : 'text-gray-400'}`} />
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          report.status === 'pending'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {report.status === 'pending' ? 'Pending' : 'Resolved'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {timeAgo(report.created_at)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Type: </span>
                        <span className="text-sm text-gray-900 capitalize">{report.type}</span>
                      </div>
                      
                      {report.reported_user_name && (
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Reported User: </span>
                          <span className="text-sm text-gray-900">{report.reported_user_name}</span>
                        </div>
                      )}

                      {report.reported_item_name && (
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Reported Item: </span>
                          <span className="text-sm text-gray-900">{report.reported_item_name}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-sm font-semibold text-gray-700">Reporter: </span>
                        <span className="text-sm text-gray-900">{report.reporter_name}</span>
                      </div>

                      {report.reason && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Reason:</p>
                          <p className="text-sm text-gray-600">{report.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {report.status === 'pending' && (
                    <button
                      onClick={() => handleResolve(report.id)}
                      className="shrink-0 inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
