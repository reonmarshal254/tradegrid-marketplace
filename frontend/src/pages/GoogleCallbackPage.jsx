import React, { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const returnTo = searchParams.get('return_to');
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (error) {
      if (returnTo) {
        window.location.href = `${returnTo}?error=${encodeURIComponent(error)}`;
        return;
      }
      navigate('/login', { state: { google_error: `Google sign-in was cancelled (${error})` } });
      return;
    }

    if (!code) {
      if (returnTo) {
        window.location.href = `${returnTo}?error=${encodeURIComponent('missing code')}`;
        return;
      }
      navigate('/login', { state: { google_error: 'Google sign-in failed: missing code' } });
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;

    if (returnTo) {
      const exchangeAndRedirect = async () => {
        try {
          const data = await api.auth.google({ code, redirect_uri: redirectUri });
          const params = new URLSearchParams({
            token: data.token,
            user: JSON.stringify(data.user),
          });
          window.location.href = `${returnTo}?${params.toString()}`;
        } catch (err) {
          window.location.href = `${returnTo}?error=${encodeURIComponent(err.message)}`;
        }
      };
      exchangeAndRedirect();
      return;
    }

    if (!state) {
      navigate('/login', { state: { google_error: 'Google sign-in failed: invalid state' } });
      return;
    }

    const expectedState = sessionStorage.getItem('sh_google_state');
    sessionStorage.removeItem('sh_google_state');
    if (!expectedState || state !== expectedState) {
      navigate('/login', { state: { google_error: 'Google sign-in failed: invalid state' } });
      return;
    }

    login(() => api.auth.google({ code, redirect_uri: redirectUri }))
      .then(() => navigate('/', { replace: true }))
      .catch((err) =>
        navigate('/login', {
          state: { google_error: `Google sign-in failed: ${err.message}` },
        })
      );
  }, [code, state, error, login, navigate, returnTo]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="flex justify-center">
        <Spinner className="h-10 w-10" />
      </div>
      <p className="mt-4 text-sm text-gray-500">Signing you in with Google...</p>
      <p className="mt-8 text-sm text-gray-400">
        Not working?{' '}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
