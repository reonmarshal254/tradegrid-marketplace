import React from 'react';

export function getPasswordStrength(password = '') {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  let label = 'Weak';
  let color = 'bg-red-500';
  if (score >= 5) {
    label = 'Strong';
    color = 'bg-green-500';
  } else if (score >= 3) {
    label = 'Fair';
    color = 'bg-amber-500';
  }
  return { score, label, color };
}

export default function PasswordStrengthMeter({ password }) {
  const { score, label, color } = getPasswordStrength(password);
  const segments = 4;
  const filled = password ? Math.max(1, Math.ceil((score / 5) * segments)) : 0;

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i < filled ? color : 'bg-gray-200'
            }`}
          />
        ))}
        <span className="ml-2 text-xs font-medium text-gray-600 w-12">{label}</span>
      </div>
    </div>
  );
}
