import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import ItemCard from '../components/ItemCard';
import { Spinner, Avatar, EmptyState, Stars } from '../components/Ui';
import { MapPinIcon, TagIcon, StarIcon, CheckCircleIcon } from '../components/Icons';
import { timeAgo } from '../utils/format';

export default function PublicProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([api.users.get(id), api.items.list({ seller_id: id, limit: 24 }), api.users.reviews(id)])
      .then(([profileRes, itemsRes, reviewsRes]) => {
        setProfile(profileRes.user);
        setItems(itemsRes.items);
        setReviews(reviewsRes.reviews);
        setRating(reviewsRes.rating);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">User not found</h1>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar user={profile} size="h-20 w-20" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {profile.name}
              {profile.is_verified && (
                <CheckCircleIcon className="w-6 h-6 text-green-500 shrink-0 drop-shadow-sm" filled={false} />
              )}
            </h1>
            {profile.location && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPinIcon className="w-4 h-4" /> {profile.location}
              </p>
            )}
            <div className="mt-1 flex items-center gap-1.5">
              <Stars value={profile.rating_avg} size="w-4 h-4" className="text-amber-400" />
              <span className="text-sm text-gray-600 font-medium">
                {profile.rating_avg != null
                  ? `${profile.rating_avg} (${profile.rating_count} review${profile.rating_count === 1 ? '' : 's'})`
                  : 'No reviews yet'}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{profile.active_items}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{profile.sold_items}</p>
              <p className="text-xs text-gray-500">Sold</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{profile.total_reactions}</p>
              <p className="text-xs text-gray-500">Reactions</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mt-8 mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <TagIcon className="w-5 h-5 text-indigo-600" /> Listings by {profile.name}
      </h2>

      {items.length === 0 ? (
        <EmptyState title="No active listings" message="This seller has no active items right now." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <h2 className="mt-10 mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <StarIcon className="w-5 h-5 text-amber-400" /> Reviews
        {rating?.count > 0 && <span className="text-sm text-gray-400">({rating.count})</span>}
      </h2>

      {rating?.count > 0 ? (
        <>
          <div className="mb-5 flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 max-w-md">
            <p className="text-4xl font-extrabold text-gray-900">{rating.avg}</p>
            <div>
              <Stars value={rating.avg} size="w-5 h-5" className="text-amber-400" />
              <p className="text-xs text-gray-500 mt-0.5">
                Based on {rating.count} review{rating.count === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <Avatar user={{ name: r.reviewer?.name, avatar_url: r.reviewer?.avatar_url, is_verified: r.reviewer?.is_verified }} size="h-9 w-9" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 inline-flex items-center gap-1.5">
                      {r.reviewer?.name}
                      {r.reviewer?.is_verified && (
                        <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 drop-shadow-sm" filled={true} />
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(r.created_at)}</p>
                  </div>
                  <Stars value={r.rating} size="w-4 h-4" className="text-amber-400" />
                </div>
                {r.comment && <p className="mt-3 text-sm text-gray-700">{r.comment}</p>}
                <Link
                  to={`/item/${r.item_id}`}
                  className="mt-2 inline-block text-xs text-indigo-600 hover:text-indigo-800"
                >
                  On item: {r.item_name}
                </Link>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">
            No reviews yet. This seller will earn reviews from buyers who confirm a purchase.
          </p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}
