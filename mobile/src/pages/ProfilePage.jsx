import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Avatar, Spinner } from '../components/Ui';
import { CameraIcon, CloseIcon } from '../components/Icons';
import { subscribeToPush, unsubscribeFromPush, isPushSupported } from '../push/push';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', location: '' });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported] = useState(isPushSupported());
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        whatsapp: user.whatsapp || '',
        location: user.location || '',
      });
    }
    checkPushState();
  }, [user]);

  function buildFormData(extra = {}) {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('phone', form.phone);
    fd.append('whatsapp', form.whatsapp);
    fd.append('location', form.location);
    Object.entries(extra).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== false) fd.append(k, v);
    });
    return fd;
  }

  async function onAvatarSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const data = await api.auth.updateProfile(buildFormData({ avatar: file }), true);
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  async function removeAvatar() {
    if (!user?.avatar_url) return;
    if (!window.confirm('Remove your profile picture?')) return;
    setError('');
    try {
      const data = await api.auth.updateProfile(buildFormData({ avatar_remove: 'true' }), true);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function checkPushState() {
    if (!isPushSupported() || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(Boolean(sub));
    } catch {
      /* ignore */
    }
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const data = await api.auth.updateProfile(buildFormData(), true);
      setUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePush() {
    if (pushEnabled) {
      await unsubscribeFromPush();
      setPushEnabled(false);
    } else {
      const result = await subscribeToPush();
      setPushEnabled(result.enabled);
      if (!result.enabled) {
        setError(
          result.reason === 'denied'
            ? 'Notifications are blocked. Enable them in your browser settings.'
            : 'Could not enable notifications.'
        );
      } else {
        setError('');
      }
    }
  }

  async function resendVerification() {
    setEmailStatus('');
    try {
      await api.auth.resendVerification(user.email);
      setEmailStatus('Verification email sent.');
    } catch (err) {
      setEmailStatus(err.message);
    }
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile settings</h1>

      {!user ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Avatar user={user} size="h-20 w-20" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-60"
                aria-label="Upload profile picture"
              >
                {uploadingAvatar ? (
                  <Spinner className="h-4 w-4 text-white" />
                ) : (
                  <CameraIcon className="w-4 h-4" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatarSelected}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-gray-400">Change profile picture</span>
                {user.avatar_url && (
                  <button
                    onClick={removeAvatar}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <CloseIcon className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {!user.email_verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-800">Email not verified</p>
                <p className="text-xs text-amber-700">
                  Verify your email to keep your account secure.
                  {emailStatus && <span className="block text-green-700 mt-1">{emailStatus}</span>}
                </p>
              </div>
              <button
                onClick={resendVerification}
                className="shrink-0 text-sm font-semibold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg transition"
              >
                Resend
              </button>
            </div>
          )}

          <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Contact details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  value={form.name}
                  disabled
                  className={`${inputCls} bg-gray-50 cursor-not-allowed opacity-75`}
                  title="Name cannot be changed to prevent spam"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Name cannot be edited. Contact support to change.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                  className={inputCls}
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={inputCls}
                  placeholder="+234..."
                />
                <p className="mt-1 text-xs text-gray-400">
                  Buyers use this to call you directly.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp number
                </label>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setField('whatsapp', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 2348012345678"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Buyers can chat with you instantly on WhatsApp.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {saved && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Profile updated successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition"
            >
              {saving && <Spinner className="h-4 w-4 text-white" />}
              Save changes
            </button>
          </form>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="font-semibold text-gray-900">Push notifications</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Get notified instantly when someone reacts to your items.
                </p>
                {!pushSupported && (
                  <p className="mt-2 text-xs text-gray-400">
                    Your browser doesn't support push notifications.
                  </p>
                )}
              </div>
              {pushSupported && (
                <button
                  onClick={togglePush}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    pushEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle push notifications"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      pushEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
