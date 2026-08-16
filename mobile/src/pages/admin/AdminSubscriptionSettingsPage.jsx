import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner } from '../../components/Ui';
import { CheckCircleIcon, StarIcon, CreditCardIcon, AlertIcon } from '../../components/Icons';

export default function AdminSubscriptionSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await api.admin.stats();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function loadSettings() {
    try {
      const data = await api.subscriptionSettings.getSettings();
      setSettings(data.settings);
    } catch (err) {
      setError('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateLocalSetting(plan, field, value) {
    setSettings(settings.map(s => 
      s.plan === plan ? { ...s, [field]: value } : s
    ));
  }

  async function savePlan(plan) {
    const planSettings = settings.find(s => s.plan === plan);
    if (!planSettings) return;

    setSaving(plan);
    setMessage('');
    setError('');

    try {
      await api.subscriptionSettings.updateSettings(plan, {
        price: parseFloat(planSettings.price),
        max_listings: parseInt(planSettings.max_listings),
        max_featured_listings: parseInt(planSettings.max_featured_listings),
        max_ads: parseInt(planSettings.max_ads),
        can_create_ads: planSettings.can_create_ads,
      });
      setMessage(`✅ ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan updated successfully!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update: ' + err.message);
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <AdminLayout stats={stats}>
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      </AdminLayout>
    );
  }

  const getPlanIcon = (plan) => {
    switch(plan) {
      case 'free': return '🆓';
      case 'personal': return '👤';
      case 'recommended': return '⭐';
      case 'enterprise': return '🏢';
      default: return '📦';
    }
  };

  const getPlanColor = (plan) => {
    switch(plan) {
      case 'free': return 'gray';
      case 'personal': return 'blue';
      case 'recommended': return 'purple';
      case 'enterprise': return 'indigo';
      default: return 'gray';
    }
  };

  return (
    <AdminLayout stats={stats}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-indigo-600 font-semibold mb-2">
            <span className="inline-flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded">
              🛡️ ADMIN ONLY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Subscription Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure pricing and limits for each subscription plan
          </p>
        </div>

      {message && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map((plan) => {
          const color = getPlanColor(plan.plan);
          const borderColor = `border-${color}-200`;
          const bgColor = `bg-${color}-50`;
          
          return (
            <div
              key={plan.plan}
              className="bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-300 transition p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getPlanIcon(plan.plan)}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                      {plan.plan} Plan
                    </h2>
                    {plan.plan === 'recommended' && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600">
                        <StarIcon className="w-3 h-3" filled />
                        Most Popular
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <CreditCardIcon className="w-4 h-4 inline mr-1" />
                    Price (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={plan.price}
                    onChange={(e) => updateLocalSetting(plan.plan, 'price', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={plan.plan === 'free'}
                  />
                  {plan.plan === 'free' && (
                    <p className="mt-1 text-xs text-gray-400">Free plan price cannot be changed</p>
                  )}
                </div>

                {/* Max Listings */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Active Listings
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={plan.max_listings}
                    onChange={(e) => updateLocalSetting(plan.plan, 'max_listings', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Use 999999 for unlimited
                  </p>
                </div>

                {/* Max Featured Listings */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Featured Listings (per month)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={plan.max_featured_listings}
                    onChange={(e) => updateLocalSetting(plan.plan, 'max_featured_listings', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Use 999999 for unlimited
                  </p>
                </div>

                {/* Max Ads */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Active Advertisements
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={plan.max_ads}
                    onChange={(e) => updateLocalSetting(plan.plan, 'max_ads', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Use 999999 for unlimited
                  </p>
                </div>

                {/* Can Create Ads Toggle */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <span className="block text-sm font-semibold text-gray-700">
                      Allow Advertisements
                    </span>
                    <span className="block text-xs text-gray-400">
                      Enable ad creation for this plan
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.can_create_ads}
                      onChange={(e) => updateLocalSetting(plan.plan, 'can_create_ads', e.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className={`h-6 w-11 rounded-full transition ${
                        plan.can_create_ads ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    />
                    <span
                      className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transform transition ${
                        plan.can_create_ads ? 'translate-x-5' : ''
                      }`}
                    />
                  </label>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mt-4">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                    Current Settings Summary
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" filled />
                      <span>
                        <strong>{plan.max_listings >= 999999 ? '∞' : plan.max_listings}</strong> active listings
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="w-3 h-3 text-green-500" filled />
                      <span>
                        <strong>{plan.max_featured_listings >= 999999 ? '∞' : plan.max_featured_listings}</strong> featured/month
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {plan.can_create_ads ? (
                        <CheckCircleIcon className="w-3 h-3 text-green-500" filled />
                      ) : (
                        <span className="w-3 h-3 text-red-500">✕</span>
                      )}
                      <span>
                        {plan.can_create_ads 
                          ? `${plan.max_ads >= 999999 ? '∞' : plan.max_ads} advertisements`
                          : 'No advertisements'
                        }
                      </span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => savePlan(plan.plan)}
                  disabled={saving === plan.plan}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
                >
                  {saving === plan.plan && <Spinner className="h-4 w-4 text-white" />}
                  {saving === plan.plan ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning Notice */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex gap-3">
          <AlertIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Important Notes</h3>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Changes take effect immediately for new subscriptions</li>
              <li>Existing subscriptions maintain their purchased limits until renewal</li>
              <li>Use 999999 as the value for unlimited features</li>
              <li>Free plan price is always 0 and cannot be changed</li>
              <li>Decreasing limits may prevent users from creating new content</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
