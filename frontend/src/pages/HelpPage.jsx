import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldIcon } from '../components/Icons';

const FAQS = [
  {
    q: 'How do I post an item for sale?',
    a: 'Create an account, tap "Sell an item", add photos, a name, description, price and category. Your item goes live instantly for buyers to contact you.',
  },
  {
    q: 'How do buyers contact me?',
    a: 'Buyers can chat with you directly inside the app by tapping "Chat with seller" on your item, or reach you on WhatsApp or by phone using the details in your profile.',
  },
  {
    q: 'Are there any fees or commission?',
    a: 'No. Posting items and contacting sellers is completely free — buyers and sellers deal directly with each other.',
  },
  {
    q: 'How do I mark an item as sold?',
    a: 'Open your item and tap "Mark as sold" from the owner actions. Once sold, it stops appearing in search results.',
  },
  {
    q: 'Can I leave a review for a seller?',
    a: 'Yes. After you mark an item you bought as purchased, you can rate the seller out of 5 stars and leave a comment. Reviews appear on the seller\'s profile.',
  },
  {
    q: 'How do I save items I like?',
    a: 'Tap the heart icon on any item. Saved items appear on your Favorites page so you can find them later.',
  },
  {
    q: 'What should I do if I spot a scam?',
    a: 'Do not send money in advance to anyone you have not met. Use the Feedback page to report suspicious listings and we will review them.',
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState(0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Help center</h1>
      <p className="mt-2 text-sm text-gray-500">
        Answers to common questions about buying and selling on TRADEGRID.
      </p>

      <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-start gap-4">
        <span className="h-10 w-10 shrink-0 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <ShieldIcon className="w-5 h-5" />
        </span>
        <p className="text-sm text-indigo-900">
          <span className="font-semibold">New here?</span> Read our{' '}
          <Link to="/safety-guidelines" className="underline font-medium">
            safety guidelines
          </Link>{' '}
          and{' '}
          <Link to="/buying-guide" className="underline font-medium">
            buying guide
          </Link>{' '}
          before your first transaction.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {FAQS.map((f, i) => (
          <div key={f.q} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
            >
              <span className="font-semibold text-gray-900">{f.q}</span>
              <span className={`shrink-0 text-gray-400 transition-transform ${open === i ? 'rotate-45' : ''}`}>
                +
              </span>
            </button>
            {open === i && <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-gray-500">Still need help?</p>
        <Link
          to="/contact"
          className="inline-flex items-center mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
