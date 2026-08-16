import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import ItemCard from '../components/ItemCard';
import { Spinner } from '../components/Ui';
import { MapPinIcon } from '../components/Icons';

export default function NearMePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(50);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadNearbyItems();
  }, [radius]);

  async function loadNearbyItems() {
    setLoading(true);
    try {
      const data = await api.items.nearby(radius, 12);
      setItems(data.items || []);
      setUserLocation(data.userLocation);
      setMessage(data.message || '');
    } catch (error) {
      console.error('Failed to load nearby items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReact(item) {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    try {
      const data = await api.items.react(item.id);
      setItems((list) => list.map((i) => (i.id === item.id ? data.item : i)));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPinIcon className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Items Near Me</h1>
        </div>
        
        {userLocation && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 inline-block">
            <p className="text-sm text-indigo-900">
              📍 Showing items near your location
              <span className="text-xs ml-2 text-indigo-600">
                ({userLocation.source === 'ip' ? 'Detected from IP' : 'From your profile'})
              </span>
            </p>
          </div>
        )}

        {message && (
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        )}
      </div>

      {/* Radius Filter */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Search Radius: {radius} km
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex gap-2">
            {[10, 25, 50, 100].map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  radius === r
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No items found nearby</h2>
          <p className="text-gray-600 mb-6">
            {userLocation
              ? `Try increasing the search radius (currently ${radius}km)`
              : 'We couldn\'t detect your location. Please update your profile location.'}
          </p>
          {userLocation && (
            <button
              onClick={() => setRadius(Math.min(radius + 50, 200))}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
            >
              Expand to {Math.min(radius + 50, 200)}km
            </button>
          )}
          {!userLocation && user && (
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
            >
              Update Profile Location
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {items.length} item{items.length === 1 ? '' : 's'} within {radius}km
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <ItemCard item={item} onReact={handleReact} />
                {item.distance !== undefined && (
                  <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    📍 {item.distanceText}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
