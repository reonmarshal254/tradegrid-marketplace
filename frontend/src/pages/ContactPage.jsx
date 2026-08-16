import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WhatsAppIcon, PhoneIcon, MapPinIcon } from '../components/Icons';

const WHATSAPP_NUMBER = '2348012345678';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  const inputCls =
    'w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Contact us</h1>
      <p className="mt-3 text-gray-600">
        Questions, feedback or issues? We would love to hear from you.
      </p>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900">Send us a message</h2>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                className={inputCls}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setField('message', e.target.value)}
                required
                rows={4}
                className={inputCls}
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-3 rounded-xl transition"
            >
              Send message
            </button>
            {sent && (
              <p className="text-sm text-green-600 font-medium text-center">
                Thank you! Your message has been sent. We will get back to you soon.
              </p>
            )}
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900">Get in touch</h2>
            <div className="mt-4 space-y-4">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-gray-700 hover:text-green-600 transition"
              >
                <span className="h-10 w-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <WhatsAppIcon className="w-5 h-5" />
                </span>
                <span>
                  <span className="block text-xs text-gray-500">WhatsApp</span>
                  <span className="font-medium">Chat with us on WhatsApp</span>
                </span>
              </a>
              <a
                href={`tel:+${WHATSAPP_NUMBER}`}
                className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 transition"
              >
                <span className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <PhoneIcon className="w-5 h-5" />
                </span>
                <span>
                  <span className="block text-xs text-gray-500">Phone</span>
                  <span className="font-medium">+{WHATSAPP_NUMBER}</span>
                </span>
              </a>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="h-10 w-10 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center">
                  <MapPinIcon className="w-5 h-5" />
                </span>
                <span>
                  <span className="block text-xs text-gray-500">Location</span>
                  <span className="font-medium">Lagos, Nigeria</span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-bold">Need help selling?</h2>
            <p className="mt-1 text-sm text-indigo-100">
              List your item in minutes and reach buyers near you.
            </p>
            <Link
              to="/post"
              className="inline-block mt-4 bg-white text-indigo-700 font-semibold px-5 py-2.5 rounded-full hover:bg-indigo-50 transition"
            >
              Post an item
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
