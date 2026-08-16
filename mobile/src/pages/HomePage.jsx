import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useItemSocket } from '../context/SocketContext';
import { api } from '../api';
import ItemCard from '../components/ItemCard';
import AdCard from '../components/AdCard';
import VideoAdGate from '../components/VideoAdGate';
import AnnouncementCarousel from '../components/AnnouncementCarousel';
import { Spinner } from '../components/Ui';
import {
  SearchIcon,
  HeartIcon,
  TagIcon,
  ShieldIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '../components/Icons';

const ROW_ACCENTS = {
  indigo: 'from-indigo-600 to-violet-600 shadow-indigo-500/25',
  emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/25',
  amber: 'from-amber-500 to-orange-500 shadow-amber-500/25',
};

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [topItems, setTopItems] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [promoItems, setPromoItems] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalListings, setTotalListings] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time item updates via WebSocket
  useItemSocket({
    onNew: (item) => {
      console.log('[homepage] new item:', item);
      // Add to top items if it gets reactions quickly
      setTotalListings((prev) => prev + 1);
    },
    onStatusChange: ({ itemId, status }) => {
      // Remove sold/deleted items from lists
      if (status === 'sold' || status === 'removed') {
        setTopItems((prev) => prev.filter(i => i.id !== itemId));
        setFeaturedItems((prev) => prev.filter(i => i.id !== itemId));
        setPromoItems((prev) => prev.filter(i => i.id !== itemId));
      }
    },
    onDeleted: ({ itemId }) => {
      setTopItems((prev) => prev.filter(i => i.id !== itemId));
      setFeaturedItems((prev) => prev.filter(i => i.id !== itemId));
      setPromoItems((prev) => prev.filter(i => i.id !== itemId));
    },
  });
  
  
  
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [top, featured, promo, cats, all, announceData, ads] = await Promise.all([
          api.items.list({ sort: 'reactions', limit: 10 }),
          api.items.list({ featured: 'true', sort: 'newest', limit: 10 }),
          api.items.list({ promo: 'true', sort: 'newest', limit: 10 }),
          api.items.categories(),
          api.items.list({ limit: 1 }),
          api.announcements.listActive(),
          api.advertisements.getApproved({ limit: 6 })
        ]);
        setTopItems(top.items);
        setFeaturedItems(featured.items);
        setPromoItems(promo.items);
        setCategories((cats.categories || []).slice(0, 8));
        setTotalListings(all.total || 0);
        setAnnouncements(announceData.announcements || []);
        setAdvertisements(ads.advertisements || []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function onSearchSubmit(e) {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/items?q=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate('/items');
    }
  }

  async function handleReact(item) {
    if (!user) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    try {
      const data = await api.items.react(item.id);
      if (topItems.some((i) => i.id === item.id)) {
        setTopItems((l) => l.map((i) => (i.id === item.id ? data.item : i)));
      }
      if (featuredItems.some((i) => i.id === item.id)) {
        setFeaturedItems((l) => l.map((i) => (i.id === item.id ? data.item : i)));
      }
      if (promoItems.some((i) => i.id === item.id)) {
        setPromoItems((l) => l.map((i) => (i.id === item.id ? data.item : i)));
      }
    } catch {
      /* ignore */
    }
  }

  function ItemRow({ icon, title, subtitle, link, items, accent = 'indigo', showAds = false }) {
    if (!loading && items.length === 0) return null;
    
    // Create mixed array with ads injected every 4-5 items
    const mixedItems = [];
    const availableAds = [...advertisements];
    let adIndex = 0;

    if (showAds && availableAds.length > 0) {
      for (let i = 0; i < items.length; i++) {
        mixedItems.push({ type: 'item', data: items[i] });
        
        // Inject ad every 4-5 items
        if ((i + 1) % 4 === 0 && adIndex < availableAds.length) {
          mixedItems.push({ type: 'ad', data: availableAds[adIndex] });
          adIndex++;
        }
      }
    } else {
      items.forEach(item => {
        mixedItems.push({ type: 'item', data: item });
      });
    }
    
    return (
      <section className="mb-12">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg ${ROW_ACCENTS[accent]}`}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-gray-500 truncate">{subtitle}</p>}
            </div>
          </div>
          {link && (
            <Link
              to={link.to}
              className="group inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {link.label}
              <ArrowRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {mixedItems.map((mixedItem, index) => (
              mixedItem.type === 'ad' ? (
                <AdCard 
                  key={`ad-${mixedItem.data.id}`} 
                  ad={mixedItem.data}
                  onView={() => console.log('Ad viewed:', mixedItem.data.title)}
                />
              ) : (
                <ItemCard 
                  key={mixedItem.data.id} 
                  item={mixedItem.data} 
                  onReact={handleReact} 
                />
              )
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-800 via-indigo-600 to-violet-700 overflow-hidden">
        <div className="absolute -top-28 -right-24 h-80 w-80 rounded-full bg-violet-400/30 blur-3xl animate-hero-float" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="absolute inset-0 hero-grid" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-white/20 backdrop-blur-sm">
              <TagIcon className="w-3.5 h-3.5" /> Trusted marketplace
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl font-black text-white leading-[1.1]">
              Buy and sell{' '}
              <span className="bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">
                pre-owned
              </span>{' '}
              items
            </h1>
            <p className="mt-4 text-indigo-100 text-sm sm:text-lg max-w-xl">
              Great deals, near you. Post an item in under a minute and connect with buyers
              directly — chat in-app, WhatsApp or phone.
            </p>

            <form onSubmit={onSearchSubmit} className="mt-8 max-w-xl">
              <div className="relative group">
                <SearchIcon className="w-5 h-5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="What are you looking for? e.g. iPhone, bicycle..."
                  className="w-full pl-13 pr-32 py-4 rounded-full border-0 bg-white text-sm shadow-xl shadow-indigo-900/20 focus:outline-none focus:ring-4 focus:ring-white/30 transition"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 hover:shadow-lg active:scale-95"
                >
                  Search
                </button>
              </div>
            </form>

            {categories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link
                    key={c.category}
                    to={`/items?category=${encodeURIComponent(c.category)}`}
                    className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/25 text-white text-xs font-medium px-3 py-1.5 rounded-full ring-1 ring-white/20 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5"
                  >
                    {c.category}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 grid grid-cols-3 max-w-md gap-4">
              <div>
                <p className="text-2xl font-extrabold text-white">
                  {totalListings ? totalListings.toLocaleString() : '100+'}
                </p>
                <p className="text-[11px] sm:text-xs text-indigo-200 mt-0.5">Live listings</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">Free</p>
                <p className="text-[11px] sm:text-xs text-indigo-200 mt-0.5">To list &amp; chat</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">Direct</p>
                <p className="text-[11px] sm:text-xs text-indigo-200 mt-0.5">No middlemen</p>
              </div>
            </div>

            {/* Announcements Carousel */}
            {announcements.length > 0 && (
              <div className="mt-8 max-w-2xl">
                <AnnouncementCarousel announcements={announcements} />
              </div>
            )}
          </div>
        </div>

        <div className="h-8 sm:h-12 bg-gray-50 rounded-t-[2rem] sm:rounded-t-[3rem] -mb-1" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top products */}
        <ItemRow
          icon={<StarIcon className="w-5 h-5" />}
          title="Top products"
          subtitle="The most popular items right now"
          link={{ to: '/items?sort=reactions', label: 'See all' }}
          items={topItems}
          accent="indigo"
          showAds={true}
        />

        {/* Featured */}
        <ItemRow
          icon={<CheckCircleIcon className="w-5 h-5" />}
          title="Featured"
          subtitle="Hand-picked items worth a closer look"
          link={{ to: '/items?featured=true', label: 'See all' }}
          items={featuredItems}
          accent="emerald"
          showAds={true}
        />

        {/* Promo */}
        <ItemRow
          icon={<TagIcon className="w-5 h-5" />}
          title="Promo deals"
          subtitle="Items highlighted at great prices"
          link={{ to: '/items?promo=true', label: 'See all' }}
          items={promoItems}
          accent="amber"
        />

        {/* Why us */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Why shop on TRADEGRID?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="group bg-white rounded-2xl border border-gray-200/80 p-6 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1 transition-all duration-300">
              <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <TagIcon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 font-semibold text-gray-900">Genuine pre-owned deals</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                Buy quality pre-owned items for a fraction of the retail price.
              </p>
            </div>
            <div className="group bg-white rounded-2xl border border-gray-200/80 p-6 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1 transition-all duration-300">
              <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <HeartIcon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 font-semibold text-gray-900">Sell in minutes</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                Post an item with photos and connect directly with buyers.
              </p>
            </div>
            <div className="group bg-white rounded-2xl border border-gray-200/80 p-6 hover:shadow-xl hover:shadow-gray-900/5 hover:-translate-y-1 transition-all duration-300">
              <span className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <ShieldIcon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 font-semibold text-gray-900">Connect directly</h3>
              <p className="mt-1.5 text-sm text-gray-500">
                Chat in-app, message on WhatsApp or call the seller. No middlemen.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 sm:p-12 text-center text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Have something to sell?
            </h2>
            <p className="mt-2 text-indigo-100 max-w-md mx-auto">
              List your item in under a minute and reach buyers near you.
            </p>
            <Link
              to="/post"
              className="inline-flex items-center gap-2 mt-6 bg-white text-indigo-700 font-semibold px-6 py-3 rounded-full hover:bg-indigo-50 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-900/20 transition-all duration-200"
            >
              Post an item
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>

      <VideoAdGate />
    </div>
  );
}
