import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { useModal } from '../components/CustomModal';
import { Spinner, Avatar } from '../components/Ui';
import { CheckCircleIcon, StarIcon, ArrowRightIcon, CreditCardIcon } from '../components/Icons';

const PLAN_FEATURES = {
  free: {
    name: 'Free',
    price: 0,
    color: 'gray',
    features: ['3 items per month', 'Basic profile', 'Community support'],
    limits: { items: 3, featured: 0, ads: 0 }
  },
  personal: {
    name: 'Personal',
    price: 500, // Will be overridden by API
    color: 'blue',
    features: ['15 items per month', '2 featured listings', 'Priority support', 'Verification eligible'],
    limits: { items: 15, featured: 2, ads: 0 }
  },
  recommended: {
    name: 'Recommended',
    price: 1500, // Will be overridden by API
    color: 'indigo',
    popular: true,
    features: ['Unlimited items', '10 featured listings', 'Create ads', 'Advanced analytics', 'Custom profile'],
    limits: { items: -1, featured: 10, ads: 5 }
  },
  enterprise: {
    name: 'Enterprise',
    price: 2500, // Will be overridden by API
    color: 'purple',
    features: ['Everything in Recommended', 'Unlimited featured', 'Unlimited ads', 'API access', 'Dedicated support'],
    limits: { items: -1, featured: -1, ads: -1 }
  }
};

export default function MyProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const modal = useModal();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [plans, setPlans] = useState(PLAN_FEATURES); // Dynamic plans from API

  useEffect(() => {
    if (user) {
      loadStats();
      loadPlans(); // Load dynamic pricing
    }
  }, [user]);

  async function loadPlans() {
    try {
      const data = await api.subscriptionSettings.getPublicPlans();
      
      // Merge API prices with local features
      const updatedPlans = { ...PLAN_FEATURES };
      data.plans.forEach(plan => {
        if (updatedPlans[plan.plan]) {
          updatedPlans[plan.plan].price = Number(plan.price);
          updatedPlans[plan.plan].limits.items = plan.max_listings === 999999 ? -1 : plan.max_listings;
          updatedPlans[plan.plan].limits.ads = plan.max_ads === 999999 ? -1 : plan.max_ads;
        }
      });
      
      setPlans(updatedPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
      // Keep using default prices if API fails
    }
  }

  async function loadStats() {
    try {
      setLoading(true);
      const [itemsRes, adsRes] = await Promise.all([
        api.items.myStats(),
        api.advertisements.getMyAds({ limit: 1 })
      ]);
      setStats({
        items: itemsRes.stats,
        ads: adsRes.advertisements?.length || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(planId) {
    if (!user || upgrading) return;
    
    try {
      setUpgrading(true);
      const plan = plans[planId];
      
      if (plan.price === 0) {
        // Downgrade to free
        await api.subscriptions.cancel();
        await refreshUser();
        return;
      }

      // Initialize Paystack payment
      const response = await api.subscriptions.initializePayment({
        plan: planId,
        amount: plan.price * 100, // Convert to kobo
      });

      // Load Paystack script if not already loaded
      if (!window.PaystackPop) {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.onload = () => initiatePayment(response.reference, planId, plan);
        document.head.appendChild(script);
      } else {
        initiatePayment(response.reference, planId, plan);
      }
    } catch (error) {
      await modal.error(error.message || 'Payment initialization failed');
    } finally {
      setUpgrading(false);
    }
  }

  function initiatePayment(reference, planId, planData) {
    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_8f1b4baa9bb2be96c540cf208204663141b4ae8a',
      email: user.email,
      amount: planData.price * 100,
      currency: 'KES',
      ref: reference,
      channels: ['mobile_money', 'card'], // Enable M-Pesa and card payments
      metadata: {
        user_id: user.id,
        plan: planId, // Send plan ID directly in metadata
        custom_fields: [
          {
            display_name: "Plan",
            variable_name: "subscription_plan",
            value: planId // Send plan ID, not name
          },
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: user.id
          }
        ]
      },
      callback: function(response) {
        // Handle success - verify payment
        handlePaymentSuccess(response.reference);
      },
      onClose: function() {
        console.log('Payment cancelled');
      },
    });
    handler.openIframe();
  }

  async function handlePaymentSuccess(reference) {
    try {
      // Verify payment on backend
      await api.subscriptions.verifyPayment(reference);
      
      // Refresh user data to get updated subscription
      await refreshUser();
      
      // Reload stats to reflect new limits
      await loadStats();
      
      await modal.success('🎉 Subscription upgraded successfully! Your new features are now active.');
    } catch (error) {
      await modal.error(error.message || 'Payment verification failed');
    }
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const currentPlan = plans[user.subscription_plan] || plans.free;
  const isExpired = user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your subscription and view your activity</p>
      </div>

      {/* Profile Overview with Subscription Badge */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <Avatar user={user} size="h-16 w-16" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {user.name}
              {user.is_verified && (
                <CheckCircleIcon className="w-5 h-5 text-green-500" filled={false} />
              )}
            </h2>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500">Member since {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/profile"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Subscription Badge Section */}
        <div className="border-t pt-4 mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Subscription Plan</p>
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
                  isExpired 
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : currentPlan.price === 0
                    ? 'bg-gray-100 text-gray-700 border border-gray-300'
                    : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-300'
                }`}>
                  {currentPlan.price > 0 && <StarIcon className="w-4 h-4" filled />}
                  {currentPlan.name}
                  {isExpired && <span className="text-red-600 ml-1">(Expired)</span>}
                </div>
                
                {currentPlan.price > 0 && !isExpired && (
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    Active
                  </span>
                )}
              </div>
              
              {user.subscription_expires_at && (
                <p className={`text-xs mt-2 ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                  {isExpired ? 'Expired' : 'Renews'} on {new Date(user.subscription_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {currentPlan.price === 0 || isExpired ? (
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
                to="/pricing"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
              >
                Manage Plans
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Current Subscription */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Current Subscription</h3>
        
        <div className={`p-4 rounded-xl border-2 ${
          isExpired ? 'border-red-200 bg-red-50' : 
          `border-${currentPlan.color}-200 bg-${currentPlan.color}-50`
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-gray-900">{currentPlan.name}</h4>
                {currentPlan.popular && (
                  <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    <StarIcon className="w-3 h-3" filled />
                    POPULAR
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currentPlan.price === 0 ? 'Free' : `KES ${currentPlan.price.toLocaleString()}`}
                {currentPlan.price > 0 && <span className="text-base font-normal text-gray-600">/month</span>}
              </p>
              {user.subscription_expires_at && (
                <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                  {isExpired ? 'Expired' : 'Expires'} on {new Date(user.subscription_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {currentPlan.price > 0 && !isExpired && (
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                Active
              </span>
            )}
          </div>
          
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Features included:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-600">
              {currentPlan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" filled />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : stats && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">This Month's Usage</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Items Listed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.items?.thisMonth || 0}
                    {currentPlan.limits.items > 0 && (
                      <span className="text-base font-normal text-gray-500">
                        /{currentPlan.limits.items}
                      </span>
                    )}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  (stats.items?.thisMonth || 0) >= currentPlan.limits.items && currentPlan.limits.items > 0
                    ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  📦
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Featured Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.items?.featured || 0}
                    {currentPlan.limits.featured > 0 && (
                      <span className="text-base font-normal text-gray-500">
                        /{currentPlan.limits.featured}
                      </span>
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  ⭐
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Advertisements</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.ads || 0}
                    {currentPlan.limits.ads > 0 && (
                      <span className="text-base font-normal text-gray-500">
                        /{currentPlan.limits.ads}
                      </span>
                    )}
                  </p>
                  {(stats.ads > 0 || currentPlan.canCreateAds) && (
                    <Link 
                      to="/my-ads" 
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1 inline-block"
                    >
                      Manage Ads →
                    </Link>
                  )}
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  📢
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {user.subscription_plan === 'free' ? 'Upgrade Your Plan' : 'Available Plans'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(plans).map(([planId, plan]) => {
            const isCurrent = user.subscription_plan === planId;
            const isUpgrade = plan.price > currentPlan.price;
            const isDowngrade = plan.price < currentPlan.price;
            
            // Hide free plan if user is already on free (no downgrade from free)
            if (user.subscription_plan === 'free' && planId === 'free') {
              return null;
            }
            
            // Hide downgrade options for free users (they can only upgrade)
            if (user.subscription_plan === 'free' && isDowngrade) {
              return null;
            }
            
            return (
              <div
                key={planId}
                className={`relative rounded-xl border-2 p-4 ${
                  isCurrent 
                    ? `border-${plan.color}-500 bg-${plan.color}-50` 
                    : 'border-gray-200 hover:border-gray-300'
                } transition`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      <StarIcon className="w-3 h-3" filled />
                      POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h4 className="font-bold text-gray-900">{plan.name}</h4>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {plan.price === 0 ? 'Free' : `KES ${plan.price.toLocaleString()}`}
                  </p>
                  {plan.price > 0 && <p className="text-sm text-gray-600">/month</p>}
                </div>
                
                <ul className="mt-4 space-y-1 text-sm">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-600">
                      <CheckCircleIcon className="w-3 h-3 text-green-500 shrink-0" filled />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="mt-4">
                  {isCurrent ? (
                    <div className="w-full py-2 px-3 rounded-lg bg-green-100 text-green-700 text-center font-semibold text-sm">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(planId)}
                      disabled={upgrading}
                      className={`w-full py-2 px-3 rounded-lg font-semibold text-sm transition ${
                        isUpgrade 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      } disabled:opacity-50`}
                    >
                      {upgrading ? (
                        <Spinner className="h-4 w-4 mx-auto" />
                      ) : (
                        <>
                          {isUpgrade ? 'Upgrade' : 'Downgrade'}
                          <ArrowRightIcon className="w-4 h-4 inline ml-1" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/my-items"
          className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition">
              📦
            </div>
            <div>
              <p className="font-semibold text-gray-900">My Items</p>
              <p className="text-sm text-gray-500">Manage listings</p>
            </div>
          </div>
        </Link>
        
        <Link
          to="/advertise"
          className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-200 transition">
              📢
            </div>
            <div>
              <p className="font-semibold text-gray-900">Create Ad</p>
              <p className="text-sm text-gray-500">Promote business</p>
            </div>
          </div>
        </Link>
        
        <Link
          to="/analytics"
          className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition">
              📊
            </div>
            <div>
              <p className="font-semibold text-gray-900">Analytics</p>
              <p className="text-sm text-gray-500">View insights</p>
            </div>
          </div>
        </Link>
        
        <Link
          to="/settings"
          className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center group-hover:bg-gray-200 transition">
              ⚙️
            </div>
            <div>
              <p className="font-semibold text-gray-900">Settings</p>
              <p className="text-sm text-gray-500">Preferences</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}