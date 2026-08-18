import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { ArrowRightIcon } from '../components/Icons';

const WHATSAPP_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const FACEBOOK_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const INSTAGRAM_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const LINK_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const CHECK_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SHARE_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const USERS_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const GIFT_ICON = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a4 4 0 00-4-4 4 4 0 00-4 4v2h8zm0 0V6a4 4 0 014-4 4 4 0 014 4v2h-8zm-8 0h16a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 012-2zm0 6h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" />
  </svg>
);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AffiliatePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeShare, setActiveShare] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [profileData, referralsData, share] = await Promise.all([
          api.referrals.getProfile(),
          api.referrals.getReferrals(),
          api.referrals.getShareData(),
        ]);
        setProfile(profileData);
        setReferrals(referralsData.referrals || []);
        setShareData(share);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCopy() {
    if (!profile?.referral_link) return;
    try {
      await navigator.clipboard.writeText(profile.referral_link);
    } catch {
      const input = document.createElement('input');
      input.value = profile.referral_link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareWhatsApp() {
    const text = `Hey! Join me on TRADEGRID - the best marketplace to buy and sell pre-owned items. Sign up using my link and get a FREE 7-day premium trial! ${profile?.referral_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setActiveShare('whatsapp');
    setTimeout(() => setActiveShare(null), 1500);
  }

  function shareFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profile?.referral_link)}&quote=${encodeURIComponent('Join me on TRADEGRID!')}`,
      '_blank',
      'width=600,height=400'
    );
    setActiveShare('facebook');
    setTimeout(() => setActiveShare(null), 1500);
  }

  function shareInstagram() {
    handleCopy();
    setActiveShare('instagram');
    setTimeout(() => setActiveShare(null), 1500);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-800 via-indigo-600 to-violet-700 overflow-hidden">
        <div className="absolute -top-28 -right-24 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl animate-hero-float" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="absolute inset-0 hero-grid" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-white/20 backdrop-blur-sm">
            {GIFT_ICON} Affiliate Program
          </span>
          <h1 className="mt-5 text-3xl sm:text-5xl font-black text-white leading-tight">
            Invite friends,{' '}
            <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
              earn rewards
            </span>
          </h1>
          <p className="mt-3 text-indigo-100 text-sm sm:text-base max-w-lg mx-auto">
            Share your referral link. When a friend signs up, you both get a free 7-day personal plan trial.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-16">
        {/* Referral Link Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Your referral link</h2>
          <p className="text-sm text-gray-500 mb-4">Share this link with friends. When they register, you both get rewarded!</p>

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2 pr-2">
            <input
              readOnly
              value={profile?.referral_link || ''}
              className="flex-1 bg-transparent text-sm text-gray-700 font-mono px-3 py-2 outline-none min-w-0 truncate"
            />
            <button
              onClick={handleCopy}
              className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                copied
                  ? 'bg-green-500 text-white scale-105'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white hover:shadow-lg active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <span className="animate-pop">{CHECK_ICON}</span>
                  Copied!
                </>
              ) : (
                <>
                  {LINK_ICON}
                  Copy
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Your code: <span className="font-mono font-semibold text-indigo-600">{profile?.referral_code}</span>
          </p>
        </div>

        {/* Share Buttons */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Share with friends</h2>
          <p className="text-sm text-gray-500 mb-5">Choose a platform to share your referral link</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={shareWhatsApp}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 hover:-translate-y-0.5 ${
                activeShare === 'whatsapp'
                  ? 'border-green-500 bg-green-50 scale-105'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
              }`}
            >
              <span className={`h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center transition-transform duration-300 ${activeShare === 'whatsapp' ? 'scale-110 rotate-6' : ''}`}>
                {WHATSAPP_ICON}
              </span>
              <span className="text-sm font-medium text-gray-700">WhatsApp</span>
            </button>

            <button
              onClick={shareFacebook}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 hover:-translate-y-0.5 ${
                activeShare === 'facebook'
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <span className={`h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center transition-transform duration-300 ${activeShare === 'facebook' ? 'scale-110 rotate-6' : ''}`}>
                {FACEBOOK_ICON}
              </span>
              <span className="text-sm font-medium text-gray-700">Facebook</span>
            </button>

            <button
              onClick={shareInstagram}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 hover:-translate-y-0.5 ${
                activeShare === 'instagram'
                  ? 'border-pink-500 bg-pink-50 scale-105'
                  : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
              }`}
            >
              <span className={`h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white flex items-center justify-center transition-transform duration-300 ${activeShare === 'instagram' ? 'scale-110 rotate-6' : ''}`}>
                {INSTAGRAM_ICON}
              </span>
              <span className="text-sm font-medium text-gray-700">Instagram</span>
            </button>

            <button
              onClick={handleCopy}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 hover:-translate-y-0.5 ${
                copied
                  ? 'border-green-500 bg-green-50 scale-105'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              <span className={`h-12 w-12 rounded-full bg-gray-900 text-white flex items-center justify-center transition-transform duration-300 ${copied ? 'scale-110 rotate-6 bg-green-500' : ''}`}>
                {copied ? CHECK_ICON : LINK_ICON}
              </span>
              <span className="text-sm font-medium text-gray-700">{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
          </div>
        </div>

        {/* Share Preview Thumbnail */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Link preview</h2>
          <p className="text-sm text-gray-500 mb-4">This is how your link appears when shared</p>

          <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
            <div className="h-32 sm:h-40 bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 hero-grid opacity-30" />
              <div className="relative text-center">
                <span className="text-2xl sm:text-3xl font-black text-white">TRADEGRID</span>
                <p className="text-indigo-100 text-xs sm:text-sm mt-1">Buy &amp; Sell Pre-Owned Items</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'T'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {shareData?.title || `${user?.name} invites you to TRADEGRID`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {shareData?.description || 'Buy and sell pre-owned items on a free marketplace'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 font-medium">
                <span className="inline-flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full">
                  {GIFT_ICON} Free 7-day premium trial
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 p-5 text-center">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center mx-auto">
              {SHARE_ICON}
            </span>
            <p className="mt-3 text-2xl font-extrabold text-gray-900">
              {profile?.stats?.total_referrals || 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Total shares</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 p-5 text-center">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center mx-auto">
              {USERS_ICON}
            </span>
            <p className="mt-3 text-2xl font-extrabold text-gray-900">
              {profile?.stats?.registered || 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Registered</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 p-5 text-center">
            <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600 flex items-center justify-center mx-auto">
              {GIFT_ICON}
            </span>
            <p className="mt-3 text-2xl font-extrabold text-gray-900">
              {profile?.stats?.trial_granted || 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Trials granted</p>
          </div>
        </div>

        {/* Referral List */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Your referrals</h2>
          </div>

          {referrals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span className="h-16 w-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                {USERS_ICON}
              </span>
              <p className="mt-4 text-sm font-medium text-gray-900">No referrals yet</p>
              <p className="mt-1 text-sm text-gray-500">Share your link to start earning rewards</p>
              <button
                onClick={handleCopy}
                className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 hover:shadow-lg active:scale-95"
              >
                {LINK_ICON} Copy referral link
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {referrals.map((r) => (
                <div key={r.id} className="px-6 py-4 flex items-center gap-3">
                  {r.referred_avatar ? (
                    <img src={r.referred_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white font-bold text-sm">
                      {r.referred_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {r.referred_name || 'Pending signup'}
                    </p>
                    <p className="text-xs text-gray-500">{timeAgo(r.created_at)}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      r.status === 'trial_granted'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'registered'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {r.status === 'trial_granted'
                      ? 'Trial active'
                      : r.status === 'registered'
                      ? 'Registered'
                      : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl shadow-gray-900/5 border border-gray-200/80 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-5">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <span className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-sm">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Share your link</p>
                <p className="text-xs text-gray-500 mt-0.5">Send your unique referral link to friends via any platform</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-sm">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Friend signs up</p>
                <p className="text-xs text-gray-500 mt-0.5">They register using your link and verify their email</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Both get rewarded</p>
                <p className="text-xs text-gray-500 mt-0.5">You and your friend each receive a free 7-day personal plan</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            to="/items"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-6 py-3 rounded-full hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            Browse marketplace
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
