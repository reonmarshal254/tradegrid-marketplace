import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import ItemCard from '../components/ItemCard';
import { Spinner, EmptyState } from '../components/Ui';
import { ClockIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';

export default function RecentlyViewedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api.items
      .recentlyViewed()
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <ClockIcon className="w-5 h-5" />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recently viewed</h1>
          <p className="text-sm text-gray-500">Items you've checked out before</p>
        </div>
      </div>

      {!user ? (
        <EmptyState
          title="Log in to see your history"
          message="Sign in to keep track of items you've viewed."
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
          title="Nothing viewed yet"
          message="Items you open will show up here so you can find them again easily."
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
        <>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <ItemCard item={item} />
                <span className="absolute bottom-3 left-3 text-[11px] text-gray-500 bg-white/90 px-2 py-0.5 rounded-full">
                  Viewed {timeAgo(item.viewed_at)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
