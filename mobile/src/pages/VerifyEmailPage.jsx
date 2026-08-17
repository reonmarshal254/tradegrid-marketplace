import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, setToken } from '../api';
import { Spinner } from '../components/Ui';
import { CheckCircleIcon } from '../components/Icons';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const submitOtp = useCallback(async (code) => {
    if (!email || code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.verifyEmail(email, code);
      setToken(res.token);
      setUser(res.user);
      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  }, [email, navigate, setUser]);

  function handleChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newOtp.join('');
    if (code.length === 6) {
      submitOtp(code);
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const newOtp = text.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    if (text.length === 6) submitOtp(text);
  }

  async function handleResend() {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    try {
      await api.auth.resendVerification(email);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setError('');
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Verify your email</h1>
          <p className="mt-2 text-sm text-gray-500">No email address provided. Please register again.</p>
          <Link to="/register" className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition">
            Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-8 text-center">
        {success ? (
          <>
            <div className="flex justify-center mb-3 text-green-500">
              <CheckCircleIcon className="h-12 w-12" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Email verified!</h1>
            <p className="mt-2 text-sm text-gray-500">Redirecting you to the homepage...</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">Verify your email</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter the 6-digit code sent to<br />
              <span className="font-semibold text-gray-700">{email}</span>
            </p>

            <div className="mt-8 flex justify-center gap-3">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                />
              ))}
            </div>

            {loading && (
              <div className="mt-4 flex justify-center">
                <Spinner className="h-5 w-5" />
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <p className="mt-6 text-sm text-gray-500">
              Didn't receive the code?{' '}
              {resendTimer > 0 ? (
                <span className="text-gray-400">Resend in {resendTimer}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </p>

            <Link
              to="/register"
              className="mt-4 inline-block text-sm text-gray-400 hover:text-gray-600"
            >
              Change email
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
