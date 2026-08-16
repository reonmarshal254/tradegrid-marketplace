import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner, Avatar, Stars } from '../components/Ui';
import {
  WhatsAppIcon,
  PhoneIcon,
  ChatIcon,
  HeartIcon,
  MapPinIcon,
  ClockIcon,
  TagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  CheckCircleIcon,
  StarIcon,
} from '../components/Icons';
import { formatPrice, timeAgo, formatWhatsAppLink } from '../utils/format';

export default function ItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [reacting, setReacting] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setActiveImage(0);
    api.items
      .get(id)
      .then((data) => setItem(data.item))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !item) return;
    api.items.view(id).catch(() => {});
  }, [id, user, item?.id]);

  async function handleReact() {
    if (!user) {
      navigate('/login', { state: { from: `/item/${id}` } });
      return;
    }
    setReacting(true);
    try {
      const data = await api.items.react(id);
      setItem(data.item);
    } catch (err) {
      /* ignore */
    } finally {
      setReacting(false);
    }
  }

  function openChat() {
    if (!user) {
      navigate('/login', { state: { from: `/item/${id}` } });
      return;
    }
    navigate(`/chat?item=${id}&seller=${item.seller?.id}`);
  }

  async function handlePurchased() {
    if (!user) {
      navigate('/login', { state: { from: `/item/${id}` } });
      return;
    }
    setPurchasing(true);
    try {
      const data = await api.items.purchased(id);
      setItem(data.item);
    } catch (err) {
      alert(err.message);
    } finally {
      setPurchasing(false);
    }
  }

  async function handleReview(e) {
    e.preventDefault();
    setReviewError('');
    setSubmittingReview(true);
    try {
      const data = await api.items.review(id, { rating: reviewRating, comment: reviewComment });
      setItem(data.item);
      setReviewComment('');
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this item permanently?')) return;
    try {
      await api.items.remove(id);
      navigate('/my-items');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSold() {
    try {
      await api.items.sold(id);
      setItem((i) => ({ ...i, status: 'sold' }));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Item not found</h1>
        <p className="mt-2 text-sm text-gray-500">{error || 'This item may have been removed.'}</p>
        <Link to="/" className="mt-6 inline-block text-indigo-600 hover:text-indigo-800 font-semibold">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const images = item.images || [];
  const isOwner = user?.id === item.seller?.id;
  const showWhatsApp = item.seller?.whatsapp;
  const showPhone = item.seller?.phone;
  const waLink = formatWhatsAppLink(item.seller?.whatsapp);
  const waMessage = encodeURIComponent(`Hi ${item.seller?.name}, I'm interested in your item "${item.name}" listed for ${formatPrice(item.price)}. Is it still available?`);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeImage]?.url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImage((a) => (a - 1 + images.length) % images.length)}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-white/90 hover:bg-white shadow-sm"
                      aria-label="Previous image"
                    >
                      <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => setActiveImage((a) => (a + 1) % images.length)}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-white/90 hover:bg-white shadow-sm"
                      aria-label="Next image"
                    >
                      <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>
                    <span className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-black/60 text-white text-xs px-2 sm:px-2.5 py-1 rounded-full">
                      {activeImage + 1} / {images.length}
                    </span>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                No image available
              </div>
            )}
            {item.status === 'sold' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-red-500 text-white text-sm font-bold uppercase tracking-wider px-6 py-2 rounded-full">
                  Sold
                </span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-2 sm:mt-3 flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition ${
                    i === activeImage ? 'border-indigo-600' : 'border-transparent'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">{item.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                {item.seller?.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {item.seller.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {timeAgo(item.created_at)}
                </span>
              </div>
            </div>
            <button
              onClick={handleReact}
              disabled={reacting}
              className={`shrink-0 inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-full border transition disabled:opacity-60 ${
                item.reacted
                  ? 'bg-red-50 border-red-300 text-red-600'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <HeartIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" filled={item.reacted} />
              <span className="hidden xs:inline">{item.reactions_count || 0}</span>
            </button>
          </div>

          <p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-extrabold text-indigo-600">
            {formatPrice(item.price)}
          </p>

          <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
            {item.featured && (
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                <StarIcon className="w-3.5 h-3.5" filled /> Featured Item
              </span>
            )}
            {item.category && (
              <Link
                to={`/items?category=${encodeURIComponent(item.category)}`}
                className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-indigo-100 transition"
              >
                <TagIcon className="w-3.5 h-3.5" /> {item.category}
              </Link>
            )}
            {item.age && (
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <ClockIcon className="w-3.5 h-3.5" /> Age: {item.age}
              </span>
            )}
            {item.has_receipt && (
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <TagIcon className="w-3.5 h-3.5" /> Receipt available
              </span>
            )}
          </div>

          <div className="mt-4 sm:mt-6">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Description
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-700 whitespace-pre-line leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Seller card */}
          <div className="mt-6 sm:mt-8 bg-gray-50 rounded-xl border border-gray-200 p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <Link to={`/user/${item.seller?.id}`}>
              <Avatar 
                user={{ 
                  name: item.seller?.name, 
                  avatar_url: item.seller?.avatar_url,
                  verified: item.seller?.verified 
                }} 
                size="h-10 w-10 sm:h-12 sm:w-12" 
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                to={`/user/${item.seller?.id}`}
                className="font-semibold text-sm sm:text-base text-gray-900 hover:text-indigo-600 inline-flex items-center gap-1.5"
              >
                {item.seller?.name}
                {item.seller?.verified && (
                  <CheckCircleIcon className="w-5 h-5 text-green-500 shrink-0 drop-shadow-sm" filled={false} />
                )}
              </Link>
              {item.seller?.location && (
                <p className="text-xs sm:text-sm text-gray-500 truncate">{item.seller.location}</p>
              )}
              <div className="mt-0.5 flex items-center gap-1.5">
                <Stars value={item.seller?.rating_avg} size="w-3 h-3 sm:w-3.5 sm:h-3.5" className="text-amber-400" />
                <span className="text-xs text-gray-500">
                  {item.seller?.rating_avg != null
                    ? `${item.seller.rating_avg} (${item.seller.rating_count})`
                    : 'No reviews yet'}
                </span>
              </div>
            </div>
          </div>

          {isOwner ? (
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => navigate(`/post?edit=${id}`)}
                className="flex-1 min-w-[140px] sm:min-w-40 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-xl transition"
              >
                Edit item
              </button>
              {item.status === 'active' && (
                <button
                  onClick={handleSold}
                  className="flex-1 min-w-[140px] sm:min-w-40 bg-gray-900 hover:bg-gray-800 text-white text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-xl transition"
                >
                  Mark as sold
                </button>
              )}
              <button
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm sm:text-base font-semibold py-2.5 sm:py-3 px-4 rounded-xl transition"
              >
                <TrashIcon className="w-4 h-4" /> Delete
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-2 sm:gap-3">
                <button
                  onClick={openChat}
                  className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-xl transition"
                >
                  <ChatIcon className="w-4 h-4 sm:w-5 sm:h-5" /> Chat with seller
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {showWhatsApp && (
                    <a
                      href={`${waLink}?text=${waMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-xl transition"
                    >
                      <WhatsAppIcon className="w-4 h-4 sm:w-5 sm:h-5" /> WhatsApp
                    </a>
                  )}
                  {showPhone && (
                    <a
                      href={`tel:${item.seller.phone}`}
                      className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-xl transition"
                    >
                      <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden xs:inline">Call</span> {item.seller.phone}
                    </a>
                  )}
                </div>
                {!showWhatsApp && !showPhone && (
                  <p className="text-xs sm:text-sm text-gray-400 text-center py-2 sm:py-3">
                    Seller hasn't added contact details yet.
                  </p>
                )}
              </div>

              {item.purchased && !item.my_review && (
                <form onSubmit={handleReview} className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900">Rate this seller</h3>
                  <p className="text-xs text-gray-500">Thanks for confirming your purchase.</p>
                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        className="text-amber-400 hover:scale-110 transition"
                      >
                        <StarIcon className="w-7 h-7" filled={n <= reviewRating} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="How was your experience? (optional)"
                    className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {reviewError && (
                    <p className="mt-2 text-sm text-red-600">{reviewError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="mt-3 w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit review'}
                  </button>
                </form>
              )}

              {item.my_review && (
                <div className="mt-6 bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center gap-3">
                  <StarIcon className="w-5 h-5 text-amber-400" filled />
                  <div className="text-sm text-amber-900">
                    <span className="font-semibold">Your review: {item.my_review.rating}/5</span>
                    {item.my_review.comment && (
                      <p className="text-xs mt-0.5">{item.my_review.comment}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <p className="mt-6 text-xs text-gray-400">
            Report issues or unsafe listings to our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
