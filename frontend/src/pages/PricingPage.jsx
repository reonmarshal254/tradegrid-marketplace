import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { CheckCircleIcon, StarIcon, ArrowRightIcon, CreditCardIcon } from '../components/Icons';

// Static feature descriptions (not prices)
const PLAN_FEATURES = {
  free: {
    name: 'Free',
    description: 'Perfect for casual sellers',
    features: [
      'Basic profile',
      'WhatsApp & phone contact',
      'Community support'
    ],
    limitations: [
      'No featured listings',
      'No ads',
      'Limited visibility'
    ]
  },
  personal: {
    name: 'Personal',
    description: 'Great for regular sellers',
    popular: false,
    features: [
      'Featured listings',
      'Priority customer support',
      'Analytics & insights',
      'Verification badge eligible'
    ],
    limitations: []
  },
  recommended: {
    name: 'Recommended',
    description: 'Best for active sellers',
    popular: true,
    features: [
      'Unlimited item listings',
      'Create advertisements',
      'Advanced analytics',
      'Priority support & verification',
      'Custom business profile'
    ],
    limitations: []
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For businesses & power sellers',
    features: [
      'Everything in Recommended',
      'Unlimited featured listings',
      'Unlimited advertisements',
      'Dedicated account manager',
      'API access',
      'Custom branding options'
    ],
    limitations: []
  }
};

export default function PricingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);
  const [error, setError] = useState('');
  
  const currentPlan = user?.subscription_plan || 'free';
  const isSubscriptionExpired = user?.subscription_expires_at && new Date(user.subscription_expires_at) < new Date();

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const data = await api.subscriptionSettings.getPublicPlans();
      // Merge database plans with static feature descriptions
      const mergedPlans = data.plans.map(dbPlan => ({
        id: dbPlan.plan,
        ...PLAN_FEATURES[dbPlan.plan],
        price: Number(dbPlan.price),
        max_listings: dbPlan.max_listings,
        max_featured_listings: dbPlan.max_featured_listings,
        max_ads: dbPlan.max_ads,
        can_create_ads: dbPlan.can_create_ads,
      }));
      setPlans(mergedPlans);
    } catch (err) {
      console.error('Failed to load plans:', err);
      setError('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price) {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(price);
  }

  async function handleUpgrade(planId) {
    if (!user) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    if (planId === 'free') {
      // Downgrade to free
      if (!window.confirm('Downgrade to Free plan? You will lose premium features.')) return;
      
      setUpgrading(planId);
      try {
        await api.subscriptions.cancel();
        await refreshUser();
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setUpgrading(null);
      }
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setUpgrading(planId);
    setError('');

    try {
      // Initialize Paystack payment
      const response = await api.subscriptions.initializePayment({
        plan: planId,
        amount: plan.price * 100, // Convert to kobo
      });

      // Load Paystack script if not already loaded
      if (!window.PaystackPop) {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.onload = () => initiatePayment(response.reference, plan);
        script.onerror = () => {
          setError('Failed to load payment processor. Please try again.');
          setUpgrading(null);
        };
        document.head.appendChild(script);
      } else {
        initiatePayment(response.reference, plan);
      }
    } catch (err) {
      setError(err.message || 'Payment initialization failed');
      setUpgrading(null);
    }
  }

  function initiatePayment(reference, plan) {
    const handler = window.PaystackPop.setup({
      key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: plan.price * 100,
      currency: 'KES',
      ref: reference,
      channels: ['mobile_money', 'card'], // Enable M-Pesa and card payments
      metadata: {
        custom_fields: [
          {
            display_name: "Plan",
            variable_name: "plan",
            value: plan.name
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
        handlePaymentSuccess(response.reference, plan.name);
      },
      onClose: function() {
        setUpgrading(null);
        setError('');
      },
    });
    handler.openIframe();
  }

  async function handlePaymentSuccess(reference, planName) {
    // Show loading state
    setError('Verifying payment...');
    
    try {
      // Verify payment on backend
      await api.subscriptions.verifyPayment(reference);
      
      // Redirect to success page instead of showing alert
      navigate(`/payment/success?plan=${planName}`);
    } catch (err) {
      setError('Payment verification failed: ' + err.message);
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Grow your business with TRADEGRID. From casual selling to enterprise solutions.
        </p>
        
        {user?.subscription_plan && (
          <div className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium border border-indigo-300">
            <CheckCircleIcon className="w-4 h-4" filled />
            Current Plan: {plans.find(p => p.id === currentPlan)?.name || 'Free'}
            {isSubscriptionExpired && <span className="text-red-600 ml-2">(Expired)</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isRecommended = plan.popular;
          
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 ${
                isRecommended
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : isCurrent
                  ? 'border-green-500 bg-green-50/50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    <StarIcon className="w-3 h-3" filled />
                    MOST POPULAR
                  </span>
                </div>
              )}
              
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    <CheckCircleIcon className="w-3 h-3" filled />
                    CURRENT PLAN
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500">/{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
                
                {plan.limitations.map((limitation, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="w-4 h-4 text-gray-300 shrink-0 mt-0.5">✗</span>
                    <span className="text-gray-400">{limitation}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {!user ? (
                  <Link
                    to="/register"
                    className={`block w-full py-2.5 px-4 rounded-xl text-center font-semibold transition ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    Get Started
                  </Link>
                ) : currentPlan === plan.id && !isSubscriptionExpired ? (
                  <div className="block w-full py-2.5 px-4 rounded-xl text-center font-semibold bg-green-100 text-green-700 border border-green-300">
                    ✓ Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading !== null}
                    className={`w-full py-2.5 px-4 rounded-xl text-center font-semibold transition flex items-center justify-center gap-2 ${
                      upgrading === plan.id
                        ? 'opacity-60 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {upgrading === plan.id && <Spinner className="h-4 w-4" />}
                    {plan.price === 0 ? 'Downgrade to Free' : plan.popular ? 'Upgrade Now' : 'Select Plan'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Frequently Asked Questions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Can I change my plan anytime?
            </h3>
            <p className="text-gray-600 text-sm">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              What happens to my items if I downgrade?
            </h3>
            <p className="text-gray-600 text-sm">
              Your existing items remain active, but new listings will be limited by your new plan.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Do you offer refunds?
            </h3>
            <p className="text-gray-600 text-sm">
              We offer a 7-day money-back guarantee for all paid plans if you're not satisfied.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Is there a setup fee?
            </h3>
            <p className="text-gray-600 text-sm">
              No setup fees. Pay only the monthly subscription fee for your chosen plan.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-4">
          Need a Custom Solution?
        </h2>
        <p className="text-indigo-100 mb-6">
          Have specific requirements? We'd love to create a custom plan for your business.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition"
        >
          Contact Sales
        </Link>
      </div>
    </div>
  );
}