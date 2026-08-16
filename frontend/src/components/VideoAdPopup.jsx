import React from 'react';
import { ExternalLinkIcon, InformationCircleIcon, CloseIcon } from './Icons';
import { Avatar } from './Ui';
import { api } from '../api';

export default function VideoAdPopup({ ad, onClose }) {
  const videoRef = React.useRef(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(false);

  function toggleMute() {
    setIsMuted((m) => {
      const next = !m;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  }

  const recordClick = async (e) => {
    e.stopPropagation();
    try {
      await api.advertisements.recordClick(ad.id);
    } catch {
      /* ignore */
    }
  };

  const handleVisit = async (e) => {
    await recordClick(e);
    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleWhatsApp = async (e) => {
    await recordClick(e);
    const clean = String(ad.whatsapp_number || '').replace(/[^0-9]/g, '');
    if (clean) window.open(`https://wa.me/${clean}`, '_blank', 'noopener,noreferrer');
  };

  const handlePhone = async (e) => {
    await recordClick(e);
    window.location.href = `tel:${ad.phone_number}`;
  };

  const handleEmail = async (e) => {
    await recordClick(e);
    window.location.href = `mailto:${ad.email}`;
  };

  const hasContactDetails = ad.whatsapp_number || ad.phone_number || ad.email;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Video area */}
        <div className="relative flex-1 min-h-0 bg-black">
          <video
            ref={videoRef}
            src={ad.video_url}
            autoPlay
            playsInline
            onEnded={onClose}
            className="absolute inset-0 w-full h-full object-contain"
          />

          {/* Mute toggle */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition"
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.5 12a4.5 4.5 0 00-2.03-3.79l-1.1 1.1A2.74 2.74 0 0114.7 12c0 .99-.51 1.87-1.34 2.38l1.1 1.1A4.49 4.49 0 0016.5 12zM19 12a7 7 0 01-1.02 3.66l1.14 1.14A9 9 0 0021 12a9.03 9.03 0 00-3.87-7.37l-1.09 1.2A7 7 0 0119 12zM3.55 4.28a1 1 0 10-1.42 1.42L5.6 9.17A9.02 9.02 0 001.5 12h2.32a7.05 7.05 0 012.1-2.28L7.5 11.3v.7h2l3 3H8.25a.75.75 0 000 1.5h2.1l1.62 1.62v2.33a1 1 0 002 0V20l3.7 3.7a1 1 0 001.42-1.42l-16-16zM10 3.72a9.1 9.1 0 01.9-.2l1.63-1.24A1 1 0 0114 3.1v.6c0 .03 0 .06-.01.09l.22 1.9L12 6.9V5.66l-2 2v1.6L8.4 11.3A9.02 9.02 0 001.5 12H2.6a7 7 0 017.4-8.28z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v8.05A4.5 4.5 0 0016.5 12zM14 3.23v2.06a7 7 0 010 13.42v2.06A9 9 0 0014 3.23z" />
              </svg>
            )}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close advertisement"
            className="absolute top-4 left-4 sm:top-5 sm:left-5 z-20 p-2.5 rounded-full bg-black/60 hover:bg-red-600 text-white transition"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Info bar */}
        <div className="shrink-0 max-h-[45vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm text-white px-4 sm:px-6 py-4">
          {/* Poster info */}
          {(ad.advertiser_name || ad.advertiser_avatar) && (
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                user={{ name: ad.advertiser_name, avatar_url: ad.advertiser_avatar }}
                size="h-10 w-10"
                showVerified={false}
              />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">From</p>
                <p className="text-sm sm:text-base font-semibold truncate">{ad.advertiser_name}</p>
              </div>
            </div>
          )}

          <h3 className="text-base sm:text-lg font-bold truncate">{ad.title}</h3>
          <p className={`text-sm text-gray-300 leading-relaxed ${showInfo ? '' : 'line-clamp-2'}`}>
            {ad.description}
          </p>

          {/* Buttons */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
            {hasContactDetails && (
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition active:scale-95"
              >
                <InformationCircleIcon className="w-5 h-5" />
                {showInfo ? 'Hide info' : 'More info'}
              </button>
            )}

            {ad.link_url && (
              <button
                type="button"
                onClick={handleVisit}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold transition active:scale-95"
              >
                <span>Visit link</span>
                <ExternalLinkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Contact details */}
          {showInfo && hasContactDetails && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ad.whatsapp_number && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold transition active:scale-95"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>
              )}
              {ad.phone_number && (
                <button
                  type="button"
                  onClick={handlePhone}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call Now</span>
                </button>
              )}
              {ad.email && (
                <button
                  type="button"
                  onClick={handleEmail}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold transition active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Email</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
