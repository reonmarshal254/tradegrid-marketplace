import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { CameraIcon, CloseIcon, PlayIcon, PaperClipIcon, StarIcon, AlertIcon } from '../components/Icons';

export default function AdvertisePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    link_url: '',
    target_audience: 'all',
    budget_amount: ''
  });
  
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [mediaType, setMediaType] = useState('image'); // 'image' or 'video'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const bannerInputRef = useRef(null);
  const videoInputRef = useRef(null);

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function onBannerSelected(e) {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
      setMediaType('image');
      // Clear video if banner is selected
      if (videoFile) {
        URL.revokeObjectURL(videoPreview);
        setVideoFile(null);
        setVideoPreview(null);
      }
    }
    e.target.value = '';
  }

  function onVideoSelected(e) {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setMediaType('video');
      // Clear banner if video is selected
      if (bannerFile) {
        URL.revokeObjectURL(bannerPreview);
        setBannerFile(null);
        setBannerPreview(null);
      }
    }
    e.target.value = '';
  }

  function clearMedia() {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setVideoFile(null);
    setVideoPreview(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.description.trim()) {
      setError('Please fill in title and description');
      return;
    }

    if (!bannerFile && !videoFile) {
      setError('Please add a banner image or video');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('target_audience', form.target_audience);
      if (form.link_url) fd.append('link_url', form.link_url);
      if (form.budget_amount) fd.append('budget_amount', form.budget_amount);
      
      if (bannerFile) fd.append('banner', bannerFile);
      if (videoFile) fd.append('video', videoFile);

      await api.advertisements.create(fd);
      navigate('/dashboard?tab=ads');
    } catch (err) {
      // Check for ad limit error
      if (err.response?.data?.code === 'AD_LIMIT_REACHED') {
        const data = err.response.data;
        const message = `🚫 Advertisement Limit Reached\n\n` +
          `You've reached the maximum of ${data.max_ads} active advertisements for your ${data.current_plan} plan.\n\n` +
          `Upgrade to Enterprise for unlimited advertisements!`;
        
        if (window.confirm(message + '\n\nWould you like to upgrade?')) {
          navigate('/pricing');
        }
        setError(err.message);
      } else if (err.response?.data?.code === 'SUBSCRIPTION_REQUIRED') {
        const message = `🚫 Premium Feature\n\nAdvertisement creation requires a Recommended or Enterprise subscription.\n\nWould you like to upgrade?`;
        if (window.confirm(message)) {
          navigate('/pricing');
        }
        setError(err.message);
      } else if (err.response?.data?.code === 'SUBSCRIPTION_EXPIRED') {
        const message = `🚫 Subscription Expired\n\nYour subscription has expired. Please renew to continue creating advertisements.\n\nRenew now?`;
        if (window.confirm(message)) {
          navigate('/pricing');
        }
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-gray-900">Login Required</h1>
        <p className="mt-2 text-sm text-gray-500">Please log in to create advertisements</p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          Log In
        </Link>
      </div>
    );
  }

  // Check subscription access - admins bypass subscription requirements
  const isAdmin = user?.role === 'admin';
  const canCreateAds = isAdmin || ['recommended', 'enterprise'].includes(user?.subscription_plan);
  const isSubscriptionExpired = !isAdmin && user?.subscription_expires_at && new Date(user.subscription_expires_at) < new Date();

  if (!canCreateAds || isSubscriptionExpired) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center bg-white rounded-2xl border border-gray-200 p-12">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
            <AlertIcon className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h1>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Advertisement creation is available for <span className="font-semibold">Recommended</span> and <span className="font-semibold">Enterprise</span> plan subscribers. 
            Upgrade your plan to promote your business and reach thousands of potential customers.
          </p>
          
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">What you'll get:</h3>
            <ul className="text-sm text-gray-700 space-y-2 text-left max-w-md mx-auto">
              <li className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-purple-600 shrink-0" filled />
                Create banner and video advertisements
              </li>
              <li className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-purple-600 shrink-0" filled />
                Target specific audiences (buyers/sellers)
              </li>
              <li className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-purple-600 shrink-0" filled />
                Track views and clicks with analytics
              </li>
              <li className="flex items-center gap-2">
                <StarIcon className="w-4 h-4 text-purple-600 shrink-0" filled />
                Appear in item feeds across the platform
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition shadow-lg"
            >
              <StarIcon className="w-5 h-5" filled />
              View Pricing Plans
            </Link>
            <Link
              to="/my-profile"
              className="inline-flex items-center justify-center gap-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-8 py-3 rounded-xl transition"
            >
              Manage Subscription
            </Link>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            Current plan: <span className="font-semibold">{user?.subscription_plan?.charAt(0).toUpperCase() + user?.subscription_plan?.slice(1) || 'Free'}</span>
          </p>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Advertisement</h1>
      <p className="mt-1 text-sm text-gray-500">
        Promote your business to thousands of TRADEGRID users
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {/* Media Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Banner Media <span className="text-red-500">*</span>
          </label>
          
          {!bannerPreview && !videoPreview ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="aspect-[2/1] rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-500 transition"
              >
                <CameraIcon className="w-8 h-8" />
                <span className="text-sm font-medium">Upload Image</span>
                <span className="text-xs text-gray-400">JPG, PNG up to 5MB</span>
              </button>
              
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="aspect-[2/1] rounded-xl border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-green-500 transition"
              >
                <PlayIcon className="w-8 h-8" />
                <span className="text-sm font-medium">Upload Video</span>
                <span className="text-xs text-gray-400">MP4, MOV up to 50MB</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              {bannerPreview && (
                <div className="relative aspect-[2/1] rounded-xl overflow-hidden border border-gray-200">
                  <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
                </div>
              )}
              
              {videoPreview && (
                <div className="relative aspect-[2/1] rounded-xl overflow-hidden border border-gray-200">
                  <video src={videoPreview} controls className="w-full h-full object-cover">
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
              
              <button
                type="button"
                onClick={clearMedia}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={onBannerSelected}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={onVideoSelected}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Advertisement Title <span className="text-red-500">*</span>
          </label>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            className={inputCls}
            placeholder="e.g. Best Electronics Store in Nairobi"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={4}
            className={`${inputCls} resize-y`}
            placeholder="Describe your business, products, or services..."
            maxLength={500}
          />
          <p className="mt-1 text-xs text-gray-400">{form.description.length}/500</p>
        </div>

        {/* Link URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Website Link <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            value={form.link_url}
            onChange={(e) => setField('link_url', e.target.value)}
            className={inputCls}
            placeholder="https://your-website.com"
            type="url"
          />
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Target Audience
          </label>
          <select
            value={form.target_audience}
            onChange={(e) => setField('target_audience', e.target.value)}
            className={inputCls}
          >
            <option value="all">All Users</option>
            <option value="buyers">Buyers Only</option>
            <option value="sellers">Sellers Only</option>
          </select>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Budget <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KES</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.budget_amount}
              onChange={(e) => setField('budget_amount', e.target.value)}
              className={`${inputCls} pl-12`}
              placeholder="e.g. 5000"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Set a budget for your advertisement campaign
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 Review Process</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Your ad will be reviewed by our team within 24 hours</li>
            <li>• You'll get notified once approved or if changes are needed</li>
            <li>• Approved ads appear in item listings and get view/click tracking</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
        >
          {loading && <Spinner className="h-4 w-4 text-white" />}
          Submit for Review
        </button>
      </form>
    </div>
  );
}