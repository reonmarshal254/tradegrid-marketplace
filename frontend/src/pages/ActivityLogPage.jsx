import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Spinner, EmptyState } from '../components/Ui';
import { TagIcon, HeartIcon, CheckCircleIcon, StarIcon, ClockIcon } from '../components/Icons';
import { timeAgo, formatPrice } from '../utils/format';

const TYPE_META = {
  item_posted: { icon: <TagIcon className="w-4 h-4" />, label: 'Posted', color: 'bg-indigo-100 text-indigo-600' },
  reacted: { icon: <HeartIcon className="w-4 h-4" />, label: 'Reacted to', color: 'bg-red-100 text-red-500' },
  purchased: { icon: <CheckCircleIcon className="w-4 h-4" />, label: 'Purchased', color: 'bg-green-100 text-green-600' },
  reviewed: { icon: <StarIcon className="w-4 h-4" />, label: 'Reviewed', color: 'bg-amber-100 text-amber-600' },
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.account
      .activity()
      .then((data) => setActivities(data.activities))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">App activity</h1>
      <p className="mt-1 text-sm text-gray-500">Your recent activity on TRADEGRID</p>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          title="No activity yet"
          message="Items you post, react to or purchase will show up here."
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
        <ul className="mt-8 bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {activities.map((a, i) => {
            const meta = TYPE_META[a.type] || TYPE_META.item_posted;
            return (
              <li key={`${a.type}-${a.item_id}-${i}`} className="flex items-start gap-3 px-4 py-4">
                <span className={`mt-0.5 h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${meta.color}`}>
                  {meta.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{meta.label}</span>{' '}
                    <Link
                      to={`/item/${a.item_id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {a.item_name}
                    </Link>
                    {a.price !== undefined && (
                      <span className="text-gray-500"> · {formatPrice(a.price)}</span>
                    )}
                    {a.rating !== undefined && (
                      <span className="inline-flex items-center gap-1 text-amber-500 ml-1">
                        <StarIcon className="w-3.5 h-3.5" filled /> {a.rating}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <ClockIcon className="w-3 h-3" /> {timeAgo(a.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
