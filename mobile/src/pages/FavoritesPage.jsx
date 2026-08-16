import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import ItemCard from '../components/ItemCard';
import { Spinner, EmptyState } from '../components/Ui';
import { HeartIcon } from '../components/Icons';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.items
      .favorites()
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) load();
    else setLoading(false);
  }, [user, load]);

  async function handleReact(item) {
    try {
      const data = await api.items.react(item.id);
      if (!data.reacted) {
        setItems((list) => list.filter((i) => i.id !== item.id));
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
          <HeartIcon className="w-5 h-5" filled />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Favorites</h1>
          <p className="text-sm text-gray-500">Items you've saved for later</p>
        </div>
      </div>

      {!user ? (
        <EmptyState
          title="Log in to see your favorites"
          message="Sign in to save and manage the items you like."
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
      ) : items.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          message="Tap the heart on any item to save it here."
          action={
            <Link
              to="/items"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-full transition"
            >
              Browse items
            </Link>
          }
        />
      ) : (
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onReact={handleReact} />
          ))}
        </div>
      )}
    </div>
  );
}
