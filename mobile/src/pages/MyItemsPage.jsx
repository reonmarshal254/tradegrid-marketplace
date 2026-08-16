import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner, EmptyState } from '../components/Ui';
import { PlusIcon, TagIcon, HeartIcon, ClockIcon, TrashIcon, CheckCircleIcon } from '../components/Icons';
import { formatPrice, timeAgo } from '../utils/format';

const TABS = [
  { value: '', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'removed', label: 'Removed' },
];

export default function MyItemsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadItems();
  }, [tab]);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await api.items.my(tab || undefined);
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" permanently?`)) return;
    setBusy(true);
    try {
      await api.items.remove(item.id);
      await loadItems();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkSold(item) {
    if (!window.confirm(`Mark "${item.name}" as sold?`)) return;
    setBusy(true);
    try {
      await api.items.sold(item.id);
      await loadItems();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My items</h1>
        <Link
          to="/post"
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-full transition"
        >
          <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Post new item
        </Link>
      </div>

      <div className="mt-4 sm:mt-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition ${
              tab === t.value
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 sm:mt-6">
        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner className="h-10 w-10" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={tab ? `No ${tab} items` : 'You have not posted any items yet'}
            message="Post your first item and start selling today."
            action={
              <Link
                to="/post"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition"
              >
                <PlusIcon className="w-4 h-4" /> Post an item
              </Link>
            }
          />
        ) : (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="p-3 sm:p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    {/* Image */}
                    <Link to={`/item/${item.id}`} className="shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg bg-gray-100 flex items-center justify-center">
                          <TagIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
                        </div>
                      )}
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/item/${item.id}`}
                        className="font-semibold text-sm sm:text-base text-gray-900 hover:text-indigo-600 block line-clamp-2 sm:truncate"
                      >
                        {item.name}
                      </Link>
                      <p className="text-base sm:text-lg font-bold text-indigo-600 mt-0.5 sm:mt-1">
                        {formatPrice(item.price)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-500">
                        {item.category && (
                          <span className="inline-flex items-center gap-1">
                            <TagIcon className="w-3 h-3" /> <span className="truncate max-w-[100px]">{item.category}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <HeartIcon className="w-3 h-3" /> {item.reactions_count || 0}
                        </span>
                        <span className="hidden xs:inline-flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" /> {timeAgo(item.created_at)}
                        </span>
                        {item.status === 'sold' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                            Sold
                          </span>
                        )}
                        {item.status === 'removed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                            Removed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Desktop */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/post?edit=${item.id}`)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded-lg transition"
                        title="Edit item"
                      >
                        Edit
                      </button>

                      {item.status === 'active' && (
                        <button
                          onClick={() => handleMarkSold(item)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded-lg transition whitespace-nowrap"
                          title="Mark as sold out"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Sold Out
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(item)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 border border-red-300 hover:bg-red-50 disabled:opacity-60 text-red-600 text-sm font-semibold px-3 py-2 rounded-lg transition"
                        title="Delete item"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons - Mobile */}
                  <div className="flex sm:hidden gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/post?edit=${item.id}`)}
                      disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                    >
                      Edit
                    </button>

                    {item.status === 'active' && (
                      <button
                        onClick={() => handleMarkSold(item)}
                        disabled={busy}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Sold
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(item)}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-1 border border-red-300 hover:bg-red-50 disabled:opacity-60 text-red-600 text-xs font-semibold px-3 py-2 rounded-lg transition"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
