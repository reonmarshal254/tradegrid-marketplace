import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import ItemCard from '../components/ItemCard';
import AdCard from '../components/AdCard';
import VideoAdGate from '../components/VideoAdGate';
import { Spinner, EmptyState } from '../components/Ui';
import { SearchIcon, MapPinIcon } from '../components/Icons';

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'reactions', label: 'Most popular' },
];

export default function ItemsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(q);

  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    sort: searchParams.get('sort') || 'newest',
    category: searchParams.get('category') || '',
    featured: searchParams.get('featured') === 'true',
    promo: searchParams.get('promo') === 'true',
    nearMe: searchParams.get('near_me') === 'true',
    radius: searchParams.get('radius') || '50',
  });

  const [items, setItems] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setSuggestions(null); // Clear previous suggestions
    try {
      let itemsData, adsData;
      
      // Use nearby endpoint if "Near Me" filter is active
      if (filters.nearMe) {
        const nearbyData = await api.items.nearby(Number(filters.radius) || 50, 12);
        itemsData = {
          items: nearbyData.items || [],
          pagination: { page: 1, total_pages: 1, total: nearbyData.total || 0 }
        };
        setUserLocation(nearbyData.userLocation);
        adsData = await api.advertisements.getApproved({ limit: 6 });
      } else {
        const params = {
          search: q,
          page,
          limit: 12,
          sort: filters.sort,
        };
        if (filters.location) params.location = filters.location;
        if (filters.minPrice) params.min_price = filters.minPrice;
        if (filters.maxPrice) params.max_price = filters.maxPrice;
        if (filters.category) params.category = filters.category;
        if (filters.featured) params.featured = 'true';
        if (filters.promo) params.promo = 'true';
        
        [itemsData, adsData] = await Promise.all([
          api.items.list(params),
          api.advertisements.getApproved({ limit: 6 })
        ]);
        setUserLocation(null);
      }
      
      setItems(itemsData.items);
      setPagination(itemsData.pagination);
      setAdvertisements(adsData.advertisements || []);
      
      // If no results and user searched, load suggestions
      if (itemsData.items.length === 0 && q && q.trim()) {
        loadSuggestions(q);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, page, filters]);

  async function loadSuggestions(searchQuery) {
    setLoadingSuggestions(true);
    try {
      const data = await api.items.searchSuggestions(searchQuery);
      setSuggestions(data);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  useEffect(() => {
    setSearchInput(q);
    setPage(1);
  }, [q]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function applySearch(e) {
    e.preventDefault();
    const sp = new URLSearchParams(searchParams);
    if (searchInput) sp.set('q', searchInput);
    else sp.delete('q');
    setSearchParams(sp);
    setPage(1);
    if (user && searchInput.trim()) {
      api.account.addSearchHistory(searchInput.trim()).catch(() => {});
    }
  }

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ 
      location: '', 
      minPrice: '', 
      maxPrice: '', 
      sort: 'newest', 
      category: '', 
      featured: false, 
      promo: false,
      nearMe: false,
      radius: '50'
    });
    setSearchInput('');
    setSearchParams({});
    setPage(1);
  }

  async function handleReact(item) {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    try {
      const data = await api.items.react(item.id);
      setItems((list) => list.map((i) => (i.id === item.id ? data.item : i)));
    } catch {
      /* ignore */
    }
  }

  const hasFilters =
    Boolean(filters.location) ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice) ||
    filters.sort !== 'newest' ||
    filters.featured ||
    filters.promo ||
    filters.nearMe ||
    Boolean(filters.category);

  const banner = filters.featured
    ? { text: 'Showing featured items', showAll: true }
    : filters.promo
      ? { text: 'Showing promo deals', showAll: true }
      : filters.category
        ? { text: `Showing items in "${filters.category}"`, showAll: true }
        : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Browse items</h1>
        <p className="mt-1 text-sm text-gray-500">
          {q
            ? `${loading ? 'Searching...' : `${pagination?.total || 0}`} result${pagination?.total === 1 ? '' : 's'} for "${q}"`
            : `${loading ? '' : `${pagination?.total || 0}`} items on sale`}
        </p>
      </div>

      <form onSubmit={applySearch} className="mb-6">
        <div className="relative max-w-2xl">
          <SearchIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search items, e.g. iPhone, bicycle..."
            className="w-full pl-12 pr-24 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
          >
            Search
          </button>
        </div>
      </form>

      {banner && (
        <div className="flex items-center justify-between gap-3 mb-6 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-indigo-700">{banner.text}</p>
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Show all items
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Near Me Filter Button */}
        <button
          onClick={() => updateFilter('nearMe', !filters.nearMe)}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full border transition ${
            filters.nearMe
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          📍 Near Me
        </button>

        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border transition ${
            showFilters || hasFilters
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MapPinIcon className="w-4 h-4" /> Filters
        </button>

        <select
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="text-sm font-medium px-4 py-2 rounded-full border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-red-600 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Near Me Location Info & Radius Slider */}
      {filters.nearMe && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          {userLocation && (
            <p className="text-sm text-indigo-900 mb-3">
              📍 Showing items near your location
              <span className="text-xs ml-2 text-indigo-600">
                ({userLocation.source === 'ip' ? 'Detected from IP' : 'From your profile'})
              </span>
            </p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Radius: {filters.radius} km
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={filters.radius}
                onChange={(e) => updateFilter('radius', e.target.value)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex gap-2">
                {[10, 25, 50, 100].map((r) => (
                  <button
                    key={r}
                    onClick={() => updateFilter('radius', r.toString())}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      Number(filters.radius) === r
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Location
            </label>
            <input
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              placeholder="e.g. Lagos, Ikeja..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Min price
            </label>
            <input
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={(e) => updateFilter('minPrice', e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Max price
            </label>
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(e) => updateFilter('maxPrice', e.target.value)}
              placeholder="100000"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-10 w-10" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          {/* No Results Message */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 mb-6">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No items found</h2>
            <p className="text-gray-600 mb-6">
              {q
                ? `We couldn't find any items matching "${q}"`
                : hasFilters
                ? 'Try adjusting your filters'
                : 'Be the first to post an item on the marketplace.'}
            </p>
            
            {/* Typo Suggestions */}
            {suggestions?.suggestedQuery && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-indigo-900 mb-2">
                  <span className="font-semibold">Did you mean:</span>
                </p>
                <button
                  onClick={() => {
                    setSearchInput(suggestions.suggestedQuery);
                    const sp = new URLSearchParams(searchParams);
                    sp.set('q', suggestions.suggestedQuery);
                    setSearchParams(sp);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
                >
                  <SearchIcon className="w-4 h-4" />
                  Search for "{suggestions.suggestedQuery}"
                </button>
              </div>
            )}

            {loadingSuggestions && (
              <div className="flex justify-center py-4">
                <Spinner className="h-6 w-6" />
                <span className="ml-2 text-sm text-gray-600">Finding similar products...</span>
              </div>
            )}

            {/* Similar Products */}
            {suggestions?.similarProducts && suggestions.similarProducts.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  You might also like these items:
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {suggestions.similarProducts.map((item) => (
                    <ItemCard key={item.id} item={item} onReact={handleReact} />
                  ))}
                </div>
              </div>
            )}

            {!loadingSuggestions && (!suggestions?.similarProducts || suggestions.similarProducts.length === 0) && q && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchParams({});
                  clearFilters();
                }}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear search and browse all items
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {items.map((item, idx) => {
              // Inject ad every 4-5 items
              const showAd = (idx + 1) % 4 === 0 && Math.floor((idx + 1) / 4) <= advertisements.length;
              const adIndex = Math.floor((idx + 1) / 4) - 1;
              
              return (
                <React.Fragment key={`item-${idx}`}>
                  <div className="relative">
                    <ItemCard item={item} onReact={handleReact} />
                    {filters.nearMe && item.distance !== undefined && (
                      <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10">
                        📍 {item.distanceText}
                      </div>
                    )}
                  </div>
                  {showAd && advertisements[adIndex] && (
                    <AdCard 
                      key={`ad-${adIndex}`}
                      ad={advertisements[adIndex]}
                      onView={() => console.log('Ad viewed')}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <VideoAdGate />
    </div>
  );
}
