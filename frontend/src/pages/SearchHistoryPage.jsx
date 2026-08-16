import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner, EmptyState } from '../components/Ui';
import { SearchIcon, TrashIcon, ClockIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';

export default function SearchHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.account
      .searchHistory()
      .then((data) => setHistory(data.history))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [user]);

  async function remove(id) {
    setHistory((h) => h.filter((x) => x.id !== id));
    try {
      await api.account.removeSearchHistory(id);
    } catch {
      /* ignore */
    }
  }

  async function clearAll() {
    if (!window.confirm('Clear all search history?')) return;
    setHistory([]);
    try {
      await api.account.clearSearchHistory();
    } catch {
      /* ignore */
    }
  }

  function search(q) {
    navigate(`/items?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <SearchIcon className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Search history</h1>
            <p className="text-sm text-gray-500">Jump back into your previous searches</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            <TrashIcon className="w-4 h-4" /> Clear all
          </button>
        )}
      </div>

      {!user ? (
        <EmptyState
          title="Log in to see your history"
          message="Sign in to keep track of your searches."
          action={
            <Link
              to="/login"
              className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-5 py-2.5 rounded-full transition"
            >
              Log in
            </Link>
          }
        />
      ) : loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          title="No searches yet"
          message="Your recent searches will appear here."
          action={
            <Link
              to="/items"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-full transition"
            >
              Search items
            </Link>
          }
        />
      ) : (
        <ul className="mt-8 bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {history.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => search(h.query)}
                className="flex-1 min-w-0 flex items-center gap-3 text-left hover:text-indigo-600 transition"
              >
                <SearchIcon className="w-4 h-4 shrink-0 text-gray-400" />
                <span className="font-medium text-gray-800 truncate">{h.query}</span>
              </button>
              <span className="shrink-0 flex items-center gap-1 text-xs text-gray-400">
                <ClockIcon className="w-3.5 h-3.5" /> {timeAgo(h.created_at)}
              </span>
              <button
                onClick={() => remove(h.id)}
                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                aria-label="Remove search"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
