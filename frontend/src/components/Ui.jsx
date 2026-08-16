import React from 'react';
import { StarIcon, CheckCircleIcon } from './Icons';

export function Stars({ value = 0, size = 'w-4 h-4', className = '' }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={size} filled={n <= rounded} />
      ))}
    </span>
  );
}

export function VerifiedBadge({ className = 'h-5 w-5' }) {
  return (
    <span className="inline-flex items-center" title="Verified user">
      <CheckCircleIcon className={`${className} text-green-500 drop-shadow-sm`} filled={true} />
    </span>
  );
}

export function Avatar({ user, size = 'h-9 w-9', className = '', showVerified = true }) {
  const sizeClass = size || 'h-9 w-9';
  const isVerified = user?.is_verified || user?.verified;
  
  // Calculate badge size based on avatar size
  const badgeSize = sizeClass.includes('h-6') || sizeClass.includes('w-6') ? 'h-4 w-4' :
                    sizeClass.includes('h-8') || sizeClass.includes('w-8') ? 'h-5 w-5' :
                    sizeClass.includes('h-10') || sizeClass.includes('w-10') ? 'h-6 w-6' :
                    sizeClass.includes('h-12') || sizeClass.includes('w-12') ? 'h-6 w-6' :
                    sizeClass.includes('h-14') || sizeClass.includes('w-14') ? 'h-7 w-7' :
                    sizeClass.includes('h-16') || sizeClass.includes('w-16') ? 'h-7 w-7' :
                    'h-5 w-5'; // default larger
  
  return (
    <div className="relative inline-block">
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.name}
          className={`rounded-full object-cover ${sizeClass} ${className}`}
        />
      ) : (
        <div
          className={`rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm ${sizeClass} ${className}`}
        >
          {(user?.name || '?')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join('')}
        </div>
      )}
      {showVerified && isVerified && (
        <span 
          className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full flex items-center justify-center ring-2 ring-white shadow-sm"
          title="Verified user"
        >
          <CheckCircleIcon className={`${badgeSize} text-green-500 fill-current drop-shadow-sm`} />
        </span>
      )}
    </div>
  );
}

export function Spinner({ className = 'h-6 w-6' }) {
  return (
    <svg className={`animate-spin text-indigo-600 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="h-10 w-10" />
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="text-center py-20 px-6">
      {icon && <div className="flex justify-center mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
