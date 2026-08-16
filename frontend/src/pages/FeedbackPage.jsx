import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';

export default function FeedbackPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const SUBJECTS = [
    'Suggestion',
    'Bug / technical issue',
    'Report an item or user',
    'Billing or account',
    'Other',
  ];

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSent(false);
    setBusy(true);
    try {
      await api.account.feedback(form);
      setSent(true);
      setForm({ subject: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
      <p className="mt-2 text-sm text-gray-500">
        Share a suggestion or report an issue with the marketplace. We read every message.
        {!user && ' You can submit as a guest.'}
      </p>

      {sent && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Thank you! Your feedback has been submitted.
        </div>
      )}
      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Topic</label>
          <select
            value={form.subject}
            onChange={(e) => setField('subject', e.target.value)}
            required
            className={inputCls}
          >
            <option value="" disabled>
              Choose a topic...
            </option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => setField('message', e.target.value)}
            rows={6}
            required
            maxLength={2000}
            className={`${inputCls} resize-y`}
            placeholder="Tell us what happened or what you'd like to see..."
          />
          <p className="mt-1 text-xs text-gray-400">{form.message.length}/2000</p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
        >
          Submit feedback
        </button>
      </form>
    </div>
  );
}
