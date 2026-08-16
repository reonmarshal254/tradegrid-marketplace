export function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(num);
}

export function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

export function formatWhatsAppLink(phone) {
  let digits = String(phone || '').replace(/[^\d]/g, '');
  // Convert Kenyan numbers: if starts with 0, replace with 254
  if (digits.startsWith('0')) digits = '254' + digits.slice(1);
  // If doesn't start with country code, add 254
  if (!digits.startsWith('254')) digits = '254' + digits;
  return `https://wa.me/${digits}`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function priceRangeLabel(minPrice, maxPrice) {
  if (!minPrice && !maxPrice) return 'Any price';
  if (minPrice && !maxPrice) return `From ${formatPrice(minPrice)}`;
  if (!minPrice && maxPrice) return `Up to ${formatPrice(maxPrice)}`;
  return `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
}
