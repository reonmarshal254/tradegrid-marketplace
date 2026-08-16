import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon, HeartIcon, TagIcon } from '../components/Icons';

const VALUES = [
  {
    icon: <TagIcon className="w-5 h-5" />,
    title: 'Affordable prices',
    text: 'Quality pre-owned items at a fraction of the retail price — great value for both buyers and sellers.',
  },
  {
    icon: <HeartIcon className="w-5 h-5" />,
    title: 'Community-driven',
    text: 'A local marketplace where neighbors trade directly. Post in minutes and connect with buyers near you.',
  },
  {
    icon: <ShieldIcon className="w-5 h-5" />,
    title: 'Direct & transparent',
    text: 'No middlemen, no complicated checkout. You contact the seller directly on WhatsApp or by phone.',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">About TRADEGRID</h1>
      <p className="mt-4 text-gray-600 leading-relaxed">
        TRADEGRID is a simple marketplace for buying and selling pre-owned items. We believe
        great things deserve a second life. Whether you are decluttering your home or hunting
        for a bargain, TRADEGRID makes it easy to list an item and connect with real people
        in your community.
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {VALUES.map((v) => (
          <div key={v.title} className="bg-white rounded-2xl border border-gray-200 p-6">
            <span className="h-11 w-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              {v.icon}
            </span>
            <h3 className="mt-4 font-semibold text-gray-900">{v.title}</h3>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{v.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-gray-50 rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">How it works</h2>
        <ol className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">Create an account</span> — sign up
              with Google or your email in seconds.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">Post an item</span> — add photos, a
              description, price and location.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">Connect & trade</span> — buyers
              chat with you in-app, or message you on WhatsApp or call you directly.
            </p>
          </li>
        </ol>
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/items"
          className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition"
        >
          Browse items
        </Link>
      </div>
    </div>
  );
}
