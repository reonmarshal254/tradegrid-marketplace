import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { CheckCircleIcon } from '../components/Icons';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is invalid or missing.');
      return;
    }
    api.auth
      .verifyEmail(token)
      .then((res) => {
        setState('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setState('error');
        setMessage(err.message);
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-8 text-center">
        {state === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner className="h-10 w-10" />
          </div>
        )}
        {state === 'success' && (
          <>
            <div className="flex justify-center mb-3 text-green-500">
              <CheckCircleIcon className="h-12 w-12" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Email verified!</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <Link
              to="/login"
              className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Continue
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-500">{message}</p>
            <Link
              to="/"
              className="mt-6 inline-block text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
