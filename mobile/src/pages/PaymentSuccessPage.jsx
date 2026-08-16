import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { CheckCircleIcon, ArrowRightIcon } from '../components/Icons';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference');
    const planParam = searchParams.get('plan');
    
    if (planParam && !reference) {
      // Direct navigation with plan (from callback success)
      setStatus('success');
      setPlanName(planParam.charAt(0).toUpperCase() + planParam.slice(1));
      setMessage('Your subscription has been activated!');
      return;
    }
    
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found');
      return;
    }

    verifyPayment(reference);
  }, [searchParams]);

  async function verifyPayment(reference) {
    try {
      const result = await api.subscriptions.verifyPayment(reference);
      
      // Force refresh user data
      await refreshUser();
      
      setStatus('success');
      setPlanName(result.plan || 'Premium');
      setMessage('Your subscription has been activated!');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Payment verification failed');
    }
  }

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Spinner className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-indigo-200 shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircleIcon className="w-12 h-12 text-white" filled />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-1">{message}</p>
        <p className="text-lg font-semibold text-indigo-600 mb-6">
          Welcome to {planName} Plan 🎉
        </p>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">What's next?</h3>
          <ul className="text-sm text-gray-700 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
              <span>Your premium features are now active</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
              <span>Create unlimited listings</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
              <span>Run advertisements to reach more buyers</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
              <span>Access advanced analytics</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/my-profile')}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg"
          >
            View My Profile
            <ArrowRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/post')}
            className="w-full inline-flex items-center justify-center gap-2 border-2 border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 font-semibold py-3 px-6 rounded-xl transition"
          >
            Post an Item
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800 font-medium text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
