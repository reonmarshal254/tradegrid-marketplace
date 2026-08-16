import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon, MapPinIcon, UserIcon, StarIcon, TagIcon } from '../components/Icons';

const TIPS = [
  {
    icon: <MapPinIcon className="w-5 h-5" />,
    title: 'Meet in a public place',
    text: 'Arrange to meet in a busy, well-lit public location — a mall, café or police station. Never invite strangers to your home or go to theirs alone.',
  },
  {
    icon: <UserIcon className="w-5 h-5" />,
    title: 'Bring someone along',
    text: 'Take a friend or family member to your meeting, especially for expensive items. Let someone know where you are going.',
  },
  {
    icon: <StarIcon className="w-5 h-5" />,
    title: 'Check the seller\'s reviews',
    text: 'Before buying, look at the seller\'s profile and reviews from previous buyers. Be cautious with brand-new accounts on high-value items.',
  },
  {
    icon: <ShieldIcon className="w-5 h-5" />,
    title: 'Never pay in advance',
    text: 'A legitimate seller will not ask for an advance payment, deposit or "reservation fee" before you receive the item. If they do, walk away.',
  },
  {
    icon: <TagIcon className="w-5 h-5" />,
    title: 'Trust your instincts',
    text: 'If a deal seems too good to be true, it usually is. Extremely low prices, pressure tactics and rushed stories are warning signs.',
  },
];

const RED_FLAGS = [
  'Seller asks for money upfront or an advance payment',
  'The price is far below market value',
  'Seller refuses to meet in person or show the item first',
  'Payment only by wire transfer, crypto or gift cards',
  'Seller pressures you to act immediately',
  'The item doesn\'t match the photos or description',
];

export default function SafetyGuidelinesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Safety guidelines</h1>
      <p className="mt-2 text-sm text-gray-500">
        Your safety comes first. Follow these best practices for every transaction.
      </p>

      <div className="mt-8 space-y-5">
        {TIPS.map((t) => (
          <div key={t.title} className="flex gap-4 bg-white rounded-2xl border border-gray-200 p-5">
            <span className="h-11 w-11 shrink-0 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              {t.icon}
            </span>
            <div>
              <h3 className="font-semibold text-gray-900">{t.title}</h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">{t.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-6">
        <h2 className="font-bold text-red-800">Red flags to watch for</h2>
        <ul className="mt-3 space-y-2">
          {RED_FLAGS.map((flag) => (
            <li key={flag} className="flex items-start gap-2 text-sm text-red-900">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              {flag}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          to="/buying-guide"
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition"
        >
          Read the buying guide
        </Link>
        <Link
          to="/feedback"
          className="inline-flex items-center justify-center border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-full transition"
        >
          Report a problem
        </Link>
      </div>
    </div>
  );
}
