import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { MapPinIcon, PhoneIcon, WhatsAppIcon, CheckCircleIcon } from '../components/Icons';

const STEPS = [
  { id: 1, title: 'Location', icon: <MapPinIcon className="w-5 h-5" /> },
  { id: 2, title: 'Contact', icon: <PhoneIcon className="w-5 h-5" /> },
];

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  async function handleNext() {
    setError('');

    // Validation
    if (currentStep === 1) {
      if (!location.trim()) {
        setError('Please enter your location');
        return;
      }
    } else if (currentStep === 2) {
      if (!phone.trim() && !whatsapp.trim()) {
        setError('Please provide at least one contact method');
        return;
      }
      // Validate phone format (optional but recommended)
      if (phone && !/^\+?[\d\s-()]+$/.test(phone)) {
        setError('Please enter a valid phone number');
        return;
      }
      if (whatsapp && !/^\+?[\d\s-()]+$/.test(whatsapp)) {
        setError('Please enter a valid WhatsApp number');
        return;
      }
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleSubmit();
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      await api.auth.updateProfile({
        location: location.trim(),
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
      });

      await refreshUser();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white mb-4 shadow-lg shadow-indigo-500/30">
            <span className="text-2xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
          <p className="mt-2 text-gray-500">Let's complete your profile to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="w-6 h-6" filled />
                  ) : (
                    step.icon
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-gray-600 hidden sm:block">{step.title}</p>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-2 sm:mx-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      currentStep > step.id ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
          {/* Step 1: Location */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Where are you located?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This helps buyers find items near them
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Nairobi, Westlands"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  💡 Tip: Include your city and neighborhood for better visibility
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">How can buyers reach you?</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Provide at least one contact method
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PhoneIcon className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <WhatsAppIcon className="w-4 h-4 inline mr-1" />
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+254 712 345 678"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-2 text-xs text-gray-500">
                  ✨ WhatsApp is recommended for quick communication
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading && <Spinner className="h-5 w-5 text-white" />}
              {currentStep === STEPS.length ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        </div>

        {/* Skip Link */}
        <p className="mt-4 text-center text-sm text-gray-500">
          You can complete this later in your{' '}
          <button
            onClick={() => navigate('/', { replace: true })}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            profile settings
          </button>
        </p>
      </div>
    </div>
  );
}
