import React from 'react';
import { Link } from 'react-router-dom';
import { WhatsAppIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-lg">
                TS
              </span>
              <span className="text-lg font-bold text-white">TRADEGRID</span>
            </div>
            <p className="mt-3 text-sm text-gray-400 max-w-xs leading-relaxed">
              The marketplace for pre-owned items. Give your things a second life and find
              great deals near you.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="hover:text-indigo-400 transition">Home</Link></li>
              <li><Link to="/items" className="hover:text-indigo-400 transition">Items</Link></li>
              <li><Link to="/categories" className="hover:text-indigo-400 transition">Categories</Link></li>
              <li><Link to="/items?featured=true" className="hover:text-indigo-400 transition">Featured</Link></li>
              <li><Link to="/items?promo=true" className="hover:text-indigo-400 transition">Promo deals</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/about" className="hover:text-indigo-400 transition">About us</Link></li>
              <li><Link to="/contact" className="hover:text-indigo-400 transition">Contact us</Link></li>
              <li><Link to="/post" className="hover:text-indigo-400 transition">Sell an item</Link></li>
              <li><Link to="/advertise" className="hover:text-indigo-400 transition">Advertise</Link></li>
              <li><Link to="/pricing" className="hover:text-indigo-400 transition">Pricing</Link></li>
              <li><Link to="/register" className="hover:text-indigo-400 transition">Create account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/buying-guide" className="hover:text-indigo-400 transition">Buying guide</Link></li>
              <li><Link to="/safety-guidelines" className="hover:text-indigo-400 transition">Safety guidelines</Link></li>
              <li><Link to="/help" className="hover:text-indigo-400 transition">Help center</Link></li>
              <li><Link to="/feedback" className="hover:text-indigo-400 transition">Feedback</Link></li>
              <li><Link to="/terms" className="hover:text-indigo-400 transition">Terms and Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-indigo-400 transition">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Get in touch
            </h4>
            <a
              href="https://wa.me/2348012345678"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition"
            >
              <WhatsAppIcon className="w-4 h-4" /> WhatsApp us
            </a>
            <p className="mt-3 text-sm text-gray-400">We usually reply within a few hours.</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} TRADEGRID. All rights reserved.
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              Powered by
              <span className="font-semibold text-gray-300 tracking-wide">
                MCOKOTH TECHNOLOGIES
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
