import React, { useState } from 'react';
import { CloseIcon, ArrowDownTrayIcon } from './Icons';
import ApkInstaller from '../plugins/apk-installer';

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function UpdateModal({ version, onDismiss }) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleUpdate() {
    setDownloading(true);
    setError('');
    try {
      const listener = await ApkInstaller.addListener('downloadProgress', (event) => {
        if (event.totalBytes > 0) {
          setProgress(Math.round((event.bytesReceived / event.totalBytes) * 100));
        }
      });

      await ApkInstaller.downloadAndInstall({ url: version.apkUrl });

      listener.remove();
    } catch (err) {
      setError(err.message || 'Download failed. Please try again.');
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 px-6 pt-6 pb-8 text-white">
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <ArrowDownTrayIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Update Available</h2>
          <p className="text-indigo-100 text-sm mt-1">
            Version {version.versionName}
            {version.fileSize ? ` · ${formatBytes(version.fileSize)}` : ''}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {version.releaseNotes && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">What's new</h3>
              <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-line bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {version.releaseNotes}
              </div>
            </div>
          )}

          {downloading && (
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Downloading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleUpdate}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
          >
            {downloading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-4 h-4" />
                Update Now
              </>
            )}
          </button>

          {!downloading && (
            <button
              onClick={onDismiss}
              className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2 transition"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
