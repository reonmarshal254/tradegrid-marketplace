import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { Spinner } from '../components/Ui';
import { CameraIcon, CloseIcon, CheckCircleIcon, StarIcon, ArrowRightIcon } from '../components/Icons';
import { CATEGORIES } from '../utils/categories';
import { useAuth } from '../auth/AuthContext';
import { useModal } from '../components/CustomModal';

const MAX_IMAGES = 8;

export default function PostItemPage() {
  const navigate = useNavigate();
  const modal = useModal();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    age: '',
    category: '',
    has_receipt: false,
  });
  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(Boolean(editId));
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitData, setLimitData] = useState(null);
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!editId) return;
    api.items
      .get(editId)
      .then((data) => {
        const item = data.item;
        setForm({
          name: item.name,
          description: item.description,
          price: String(item.price),
          age: item.age || '',
          category: item.category || '',
          has_receipt: item.has_receipt,
        });
        setExistingImages(item.images || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingItem(false));
  }, [editId]);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - previews.length;
    const picked = files.slice(0, remaining);
    const next = picked.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews((p) => [...p, ...next]);
    e.target.value = '';
  }

  function removePreview(index) {
    setPreviews((p) => {
      URL.revokeObjectURL(p[index].url);
      return p.filter((_, i) => i !== index);
    });
  }

  function removeExisting(index) {
    setExistingImages((imgs) => imgs.filter((_, i) => i !== index));
    setRemoveImages(true);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      setError('Cannot access camera. Please use file upload instead.');
    }
  }

  // Attach the camera stream once the video element is mounted
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [showCamera]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob && previews.length < MAX_IMAGES) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const url = URL.createObjectURL(file);
          setPreviews(p => [...p, { file, url }]);
        }
      }, 'image/jpeg', 0.8);
    }
    
    stopCamera();
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.description.trim() || form.price === '') {
      setError('Please fill in name, description and price');
      return;
    }
    if (!form.category) {
      setError('Please choose a category');
      return;
    }
    if (!editId && previews.length === 0) {
      setError('Add at least one photo of your item');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('price', form.price);
      fd.append('category', form.category);
      if (form.age) fd.append('age', form.age);
      fd.append('has_receipt', String(form.has_receipt));
      previews.forEach((p) => fd.append('images', p.file));
      let itemId;
      if (editId) {
        if (removeImages) fd.append('replace_images', 'true');
        const data = await api.items.update(editId, fd);
        itemId = data.item.id;
      } else {
        const data = await api.items.create(fd);
        itemId = data.item.id;
      }
      await modal.success(
        editId
          ? 'Your changes have been saved successfully.'
          : `"${form.name.trim()}" is now live and visible to buyers.`,
        {
          title: editId ? 'Changes saved' : 'Item posted',
          confirmText: editId ? 'View item' : 'View your listing',
        }
      );
      navigate(`/item/${itemId}`);
    } catch (err) {
      // Check if this is a subscription limit error
      if (err.response?.data?.code === 'LISTING_LIMIT_REACHED') {
        const data = err.response.data;
        setLimitData(data);
        setShowLimitModal(true);
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loadingItem) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        {editId ? 'Edit item' : 'Sell an item'}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Add photos, a catchy name, and a clear description to sell faster.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {/* Photos */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Photos <span className="text-red-500">*</span>
            {!editId && <span className="font-normal text-gray-400"> ({previews.length}/{MAX_IMAGES})</span>}
          </label>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {existingImages.map((img, i) => (
              <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExisting(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition"
                  aria-label="Remove image"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {previews.map((p, i) => (
              <div key={p.url} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePreview(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition"
                  aria-label="Remove image"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {previews.length + existingImages.length < MAX_IMAGES && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-indigo-500 transition"
                >
                  <CameraIcon />
                  <span className="text-xs font-medium">Upload</span>
                </button>
                
                <button
                  type="button"
                  onClick={startCamera}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-green-500 transition"
                >
                  <CameraIcon />
                  <span className="text-xs font-medium">Camera</span>
                </button>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFilesSelected}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Item name <span className="text-red-500">*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            className={inputCls}
            placeholder="e.g. iPhone 13, Mountain bike, Office chair"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>
              Choose a category...
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KES</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                className={`${inputCls} pl-12`}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Age <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              value={form.age}
              onChange={(e) => setField('age', e.target.value)}
              className={inputCls}
              placeholder="e.g. 2 years, 6 months"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={5}
            className={`${inputCls} resize-y`}
            placeholder="Condition, reason for selling, what's included, pickup info..."
            maxLength={2000}
          />
          <p className="mt-1 text-xs text-gray-400">{form.description.length}/2000</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.has_receipt}
            onChange={(e) => setField('has_receipt', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700">
            I have the original receipt for this item
            <span className="block text-xs text-gray-400">
              Buyers love items with receipts - increases trust.
            </span>
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
          >
            {loading && <Spinner className="h-4 w-4 text-white" />}
            {editId ? 'Save changes' : 'Post item'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => navigate(`/item/${editId}`)}
              className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
        </div>

        {!editId && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            Buyers contact you directly on WhatsApp or phone. No commission.
          </p>
        )}
      </form>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Take Photo</h3>
                <button
                  onClick={stopCamera}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-square object-cover rounded-xl bg-gray-100"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
                >
                  Capture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Listing Limit Modal */}
      {showLimitModal && limitData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">🚫</span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Listing Limit Reached</h3>
              <p className="text-gray-600 mb-4">
                You've reached the maximum of <span className="font-bold text-amber-600">{limitData.maxListings} active listings</span> for your <span className="font-semibold capitalize">{limitData.currentPlan}</span> plan.
              </p>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-6 text-left">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <StarIcon className="w-4 h-4 text-amber-500" filled />
                  Upgrade to list more items
                </h4>
                <ul className="text-sm text-gray-700 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
                    <span><strong>Personal</strong>: Up to 15 listings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
                    <span><strong>Recommended</strong>: Unlimited listings + ads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" filled />
                    <span><strong>Enterprise</strong>: Everything unlimited</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg"
                >
                  <StarIcon className="w-4 h-4" filled />
                  View Pricing Plans
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="text-gray-600 hover:text-gray-800 font-medium text-sm py-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
