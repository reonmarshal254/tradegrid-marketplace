import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Spinner, EmptyState } from '../components/Ui';
import { CATEGORIES, CATEGORY_EMOJI } from '../utils/categories';

export default function CategoriesPage() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.items
      .categories()
      .then((data) => {
        const map = {};
        data.categories.forEach((c) => {
          map[c.category] = c.count;
        });
        setCounts(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Categories</h1>
      <p className="mt-2 text-sm text-gray-500">
        Browse items by category to find exactly what you need.
      </p>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to={`/items?category=${encodeURIComponent(cat)}`}
              className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md transition"
            >
              <span className="h-12 w-12 shrink-0 rounded-xl bg-indigo-50 text-2xl flex items-center justify-center">
                {CATEGORY_EMOJI[cat] || '📦'}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                  {cat}
                </span>
                <span className="block text-xs text-gray-400">
                  {counts[cat] || 0} item{counts[cat] === 1 ? '' : 's'}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          to="/items"
          className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition"
        >
          Browse all items
        </Link>
      </div>
    </div>
  );
}
