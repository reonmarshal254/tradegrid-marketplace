import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, StarIcon, MapPinIcon, ShieldIcon } from '../components/Icons';

const STEPS = [
  {
    icon: <CheckCircleIcon className="w-5 h-5" />,
    title: 'Read the listing carefully',
    text: 'Check the photos, description, age and condition. Look for details like included accessories, scratches, or repairs mentioned by the seller.',
  },
  {
    icon: <StarIcon className="w-5 h-5" />,
    title: 'Check the seller',
    text: 'Review the seller\'s profile, rating and feedback from previous buyers. Sellers with multiple positive reviews are a good sign.',
  },
  {
    icon: <MapPinIcon className="w-5 h-5" />,
    title: 'Inspect before you pay',
    text: 'Always examine the item in person before paying. Turn electronics on, check for damage and confirm it matches the description.',
  },
  {
    icon: <ClockIcon className="w-5 h-5" />,
    title: 'Meet in a safe place',
    text: 'Arrange to meet in a busy public location. Take someone with you and agree on the exact price beforehand.',
  },
  {
    icon: <ShieldIcon className="w-5 h-5" />,
    title: 'Pay in cash, in person',
    text: 'Hand over payment only when you have the item in hand. Avoid wire transfers, gift cards and advance payments.',
  },
];

const INSPECTION_CHECKLIST = [
  'Test that electronics power on and all buttons/ports work',
  'Check for cracks, deep scratches, rust or water damage',
  'Verify serial numbers match the box/receipt if provided',
  'For furniture, check joints, hinges and stability',
  'For clothing, check for stains, holes or excessive wear',
  'Confirm the seller is the real owner and the item isn\'t stolen',
];

export default function BuyingGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Buying guide</h1>
      <p className="mt-2 text-sm text-gray-500">
        Best practices for inspecting pre-owned items and completing a safe purchase.
      </p>

      <div className="mt-8 space-y-5">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-4 bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-col items-center">
              <span className="h-8 w-8 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-9 w-9 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  {s.icon}
                </span>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
              </div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6">
        <h2 className="font-bold text-green-800">Inspection checklist</h2>
        <ul className="mt-3 space-y-2">
          {INSPECTION_CHECKLIST.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-green-900">
              <CheckCircleIcon className="w-4 h-4 shrink-0 text-green-500 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          to="/items"
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition"
        >
          Start shopping
        </Link>
        <Link
          to="/safety-guidelines"
          className="inline-flex items-center justify-center border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-full transition"
        >
          Safety guidelines
        </Link>
      </div>
    </div>
  );
}
