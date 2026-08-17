import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { Spinner } from '../../components/Ui';
import { UploadIcon, TrashIcon, CheckCircleIcon } from '../../components/Icons';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function AdminAppVersionsPage() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ version_code: '', version_name: '', release_notes: '' });
  const [apkFile, setApkFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api.admin.appVersions();
      setVersions(data.versions || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!apkFile) { setError('Select an APK file'); return; }
    if (!form.version_code || !form.version_name) { setError('Version code and name are required'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('apk', apkFile);
      fd.append('version_code', form.version_code);
      fd.append('version_name', form.version_name);
      fd.append('release_notes', form.release_notes);
      await api.admin.createAppVersion(fd);
      setForm({ version_code: '', version_name: '', release_notes: '' });
      setApkFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setSuccess('Version published successfully');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this version?')) return;
    try {
      await api.admin.deleteAppVersion(id);
      load();
    } catch { /* ignore */ }
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <UploadIcon className="w-5 h-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Versions</h1>
          <p className="text-sm text-gray-500">Upload APK files and manage mobile app releases</p>
        </div>
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Upload new version</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version code (integer)</label>
              <input
                type="number"
                required
                value={form.version_code}
                onChange={(e) => setForm(f => ({ ...f, version_code: e.target.value }))}
                className={inputCls}
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version name</label>
              <input
                required
                value={form.version_name}
                onChange={(e) => setForm(f => ({ ...f, version_name: e.target.value }))}
                className={inputCls}
                placeholder="e.g. 1.1.0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Release notes</label>
            <textarea
              rows={3}
              value={form.release_notes}
              onChange={(e) => setForm(f => ({ ...f, release_notes: e.target.value }))}
              className={inputCls}
              placeholder="What's new in this version..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">APK file</label>
            <input
              ref={fileRef}
              type="file"
              accept=".apk"
              onChange={(e) => setApkFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg transition"
          >
            {uploading ? <Spinner className="h-4 w-4 text-white" /> : <UploadIcon className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Publish version'}
          </button>
        </form>
      </div>

      {/* Version list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Published versions</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No versions published yet</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {versions.map((v, i) => (
              <div key={v.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${i === 0 ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gray-400'}`}>
                  v{v.version_name}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">v{v.version_name}</span>
                    <span className="text-xs text-gray-400">code {v.version_code}</span>
                    {i === 0 && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Latest</span>}
                  </div>
                  {v.release_notes && <p className="text-sm text-gray-500 mt-0.5 truncate">{v.release_notes}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{formatBytes(v.file_size)}</span>
                    <span>{timeAgo(v.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
