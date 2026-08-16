import React from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon, StarIcon, MapPinIcon, ClockIcon, CheckCircleIcon } from './Icons';
import { formatPrice, timeAgo, initials } from '../utils/format';

export default function ItemCard({ item, onReact }) {
  const image = item.images?.[0]?.url;
  const isVerified = item.seller?.is_verified || item.seller?.verified;
  
  return (
    <Link
      to={`/item/${item.id}`}
      className="group relative bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200/80 hover:border-gray-300 hover:shadow-2xl hover:shadow-gray-900/10 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs sm:text-sm">
            No image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {item.status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wide px-2 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-lg">
              Sold
            </span>
          </div>
        )}
        {item.featured && item.status !== 'sold' && (
          <span className="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-md flex items-center gap-0.5">
            <StarIcon className="w-2.5 sm:w-3 h-2.5 sm:h-3" filled />
            Featured
          </span>
        )}
        {item.category && !item.featured && item.status !== 'sold' && (
          <span className="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 bg-white/90 backdrop-blur-sm text-[9px] sm:text-[10px] font-semibold text-gray-700 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-sm">
            {item.category}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onReact) onReact(item);
          }}
          className={`absolute top-1.5 sm:top-2.5 right-1.5 sm:right-2.5 p-1.5 sm:p-2 rounded-full bg-white/95 hover:bg-white shadow-md transition-all duration-200 ${
            item.reacted ? 'text-red-500' : 'text-gray-500 hover:text-red-500 hover:scale-110 active:scale-90'
          }`}
          aria-label="React"
        >
          <HeartIcon
            className={`w-4 sm:w-5 h-4 sm:h-5 ${item.reacted ? 'animate-pop' : ''}`}
            filled={item.reacted}
          />
        </button>
      </div>

      <div className="p-2 sm:p-4">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <span className="text-sm sm:text-lg font-extrabold text-gray-900 truncate">{formatPrice(item.price)}</span>
          {item.reactions_count > 0 && (
            <span className="hidden xs:flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <HeartIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> {item.reactions_count}
            </span>
          )}
        </div>
        <h3 className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-indigo-600 transition-colors duration-200">
          {item.name}
        </h3>

        <div className="mt-2 sm:mt-3 flex items-center gap-1 sm:gap-2">
          <span className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 text-[9px] sm:text-[10px] font-bold flex items-center justify-center ring-1 ring-indigo-100 shrink-0">
            {initials(item.seller?.name)}
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-gray-500 truncate min-w-0">
            <span className="truncate">{item.seller?.name}</span>
            {isVerified && (
              <CheckCircleIcon className="w-4 sm:w-5 h-4 sm:h-5 text-green-500 shrink-0 drop-shadow-sm" filled={false} />
            )}
          </span>
          {item.seller?.rating_avg != null && (
            <span className="hidden xs:inline-flex items-center gap-0.5 text-xs font-medium text-amber-500 ml-auto shrink-0">
              <StarIcon className="w-3 sm:w-3.5 h-3 sm:h-3.5" filled /> {item.seller.rating_avg}
            </span>
          )}
        </div>

        <div className="mt-1.5 sm:mt-2.5 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-gray-400 pt-1.5 sm:pt-2.5 border-t border-gray-100">
          {item.seller?.location && (
            <span className="inline-flex items-center gap-0.5 sm:gap-1 truncate flex-1 min-w-0">
              <MapPinIcon className="w-2.5 sm:w-3 h-2.5 sm:h-3 shrink-0" /> 
              <span className="truncate">{item.seller.location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 sm:gap-1 shrink-0">
            <ClockIcon className="w-2.5 sm:w-3 h-2.5 sm:h-3" /> {timeAgo(item.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
