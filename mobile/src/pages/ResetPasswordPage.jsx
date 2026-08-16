import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

export default function ResetPasswordPage() {
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be at least 8 characters with letters and numbers');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.resetPassword(otp, password);
      setStatus(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900">Password updated</h1>
          <p className="mt-2 text-sm text-gray-500">{status}</p>
          <Link
            to="/login"
            className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition"
          >
            Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the 6-digit code sent to your email and choose a new password.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reset code</label>
            <input
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="000000"
              maxLength={6}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the 6-digit code from your email
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Min 8 characters, letters and numbers"
            />
            <PasswordStrengthMeter password={password} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Repeat password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {loading && <Spinner className="h-4 w-4 text-white" />}
            Reset password
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-500 text-center">
          Didn't receive a code?{' '}
          <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Resend code
          </Link>
        </p>
      </div>
    </div>
  );
}
