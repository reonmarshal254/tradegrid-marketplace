import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/Ui';
import { StarIcon, ArrowRightIcon } from '../components/Icons';

const NOTIF_OPTIONS = [
  { key: 'notif_reactions', label: 'Reactions', hint: 'Someone reacts to your items' },
  { key: 'notif_sold', label: 'Item sold', hint: 'Your items get marked as sold' },
  { key: 'notif_reviews', label: 'Reviews', hint: 'Buyers leave you a review' },
  { key: 'notif_push', label: 'Push notifications', hint: 'Browser notifications on this device' },
  { key: 'notif_email', label: 'Email notifications', hint: 'Important account emails' },
];

export default function SettingsPage() {
  const { user, setUser, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [settings, setSettings] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.account
      .settings()
      .then((data) => {
        setSettings(data.settings || {});
        setName(data.user.name || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveName(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await api.auth.updateProfile({ name });
      setUser(data.user);
      setMessage('Name updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSetting(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setMessage('');
    setError('');
    try {
      await api.account.updateSettings({ [key]: value });
    } catch (err) {
      setError(err.message);
      setSettings(settings);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your name, email and notification preferences</p>

      {/* Subscription Badge */}
      <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">Subscription Status</h3>
              {(!user?.subscription_plan || user?.subscription_plan === 'free') ? (
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
                  Free Plan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  <StarIcon className="w-3 h-3" filled />
                  {user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)} Plan
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {(!user?.subscription_plan || user?.subscription_plan === 'free')
                ? 'Upgrade to unlock more features, create advertisements, and access advanced analytics.'
                : `You're subscribed to ${user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)}. Enjoy all premium features!`
              }
            </p>
            {user?.subscription_expires_at && (
              <p className="mt-1 text-xs text-gray-500">
                {new Date(user.subscription_expires_at) < new Date() 
                  ? 'Subscription expired' 
                  : `Expires on ${new Date(user.subscription_expires_at).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
          <div>
            {(!user?.subscription_plan || user?.subscription_plan === 'free' || (user?.subscription_expires_at && new Date(user.subscription_expires_at) < new Date())) ? (
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg hover:shadow-xl"
              >
                <StarIcon className="w-4 h-4" filled />
                Upgrade Now
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/my-profile"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
              >
                Manage Subscription
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {message && (
        <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-6">
        <form onSubmit={saveName} className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900">Display name</h2>
          <div className="mt-4 flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Your name"
              maxLength={80}
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Save
            </button>
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900">Email address</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your account email
          </p>
          <div className="mt-4">
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className={`${inputCls} bg-gray-50 cursor-not-allowed opacity-75`}
              title="Email cannot be changed to prevent spam and unauthorized access"
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Email cannot be edited. Contact support if you need to change your email address.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900">Notification preferences</h2>
          <div className="mt-4 divide-y divide-gray-100">
            {NOTIF_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center justify-between gap-4 py-3 cursor-pointer">
                <span>
                  <span className="block text-sm font-medium text-gray-800">{opt.label}</span>
                  <span className="block text-xs text-gray-400">{opt.hint}</span>
                </span>
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings[opt.key] !== false}
                    onChange={(e) => toggleSetting(opt.key, e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`h-6 w-11 rounded-full transition ${settings[opt.key] !== false ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  />
                  <span
                    className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transform transition ${settings[opt.key] !== false ? 'translate-x-5' : ''}`}
                  />
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Push notifications also require your browser permission, managed on the Profile page.
          </p>
        </div>
      </div>
    </div>
  );
}
