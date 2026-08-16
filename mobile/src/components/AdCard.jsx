import React from 'react';
import { ExternalLinkIcon, InformationCircleIcon, CloseIcon } from './Icons';
import { Avatar } from './Ui';
import { api } from '../api';

export default function AdCard({ ad, onView }) {
  const [showInfo, setShowInfo] = React.useState(false);

  const handleClick = async () => {
    try {
      await api.advertisements.recordClick(ad.id);
      if (ad.link_url) {
        window.open(ad.link_url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to record click:', error);
    }
  };

  const handleWhatsAppClick = async () => {
    try {
      await api.advertisements.recordClick(ad.id);
      const cleanNumber = ad.whatsapp_number.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to record WhatsApp click:', error);
    }
  };

  const handlePhoneClick = async () => {
    try {
      await api.advertisements.recordClick(ad.id);
      window.location.href = `tel:${ad.phone_number}`;
    } catch (error) {
      console.error('Failed to record phone click:', error);
    }
  };

  const handleEmailClick = async () => {
    try {
      await api.advertisements.recordClick(ad.id);
      window.location.href = `mailto:${ad.email}`;
    } catch (error) {
      console.error('Failed to record email click:', error);
    }
  };

  React.useEffect(() => {
    const handleView = async () => {
      try {
        await api.advertisements.recordView(ad.id);
        if (onView) onView();
      } catch (error) {
        console.error('Failed to record view:', error);
      }
    };
    handleView();
  }, [ad.id]);

  const hasContactDetails = ad.whatsapp_number || ad.phone_number || ad.email;
  const hasLink = Boolean(ad.link_url);

  return (
    <div className="relative h-72 sm:h-80 lg:h-96 rounded-xl sm:rounded-2xl overflow-hidden group border-2 border-blue-200 shadow-md">
      {/* Banner image fills the whole card */}
      <img
        src={ad.banner_url}
        alt={ad.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      {/* Scrim for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />

      {/* Sponsored label + Info button */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 p-3 sm:p-4">
        <span className="inline-flex items-center gap-1.5 bg-black/55 backdrop-blur-sm text-white text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full">
          📢 Sponsored
        </span>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label="View advertisement details"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 hover:border-white/60 rounded-full px-3 py-1.5 transition-all duration-200"
        >
          <InformationCircleIcon className="w-4 h-4" />
          Info
        </button>
      </div>

      {/* Content floating on the banner */}
      <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 text-white">
        <h3 className="text-lg sm:text-2xl font-bold leading-snug mb-1.5 drop-shadow-lg">
          {ad.title}
        </h3>
        <p className="text-sm sm:text-base text-white/90 line-clamp-2 leading-relaxed mb-4 drop-shadow">
          {ad.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-lg active:scale-95"
          >
            <InformationCircleIcon className="w-5 h-5" />
            See details
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {showInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  Sponsored Advertisement
                </span>
                <h3 className="text-lg font-bold text-gray-900 leading-snug mt-0.5 truncate">
                  {ad.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                aria-label="Close"
                className="shrink-0 p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {ad.banner_url && (
                <img
                  src={ad.banner_url}
                  alt={ad.title}
                  className="w-full h-44 object-cover rounded-xl bg-gray-100"
                />
              )}

              {ad.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{ad.description}</p>
              )}

              {ad.advertiser_name && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Avatar
                    user={{ name: ad.advertiser_name, avatar_url: ad.advertiser_avatar }}
                    size="h-10 w-10"
                    showVerified={false}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Advertiser</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {ad.advertiser_name}
                    </p>
                  </div>
                </div>
              )}

              {!hasLink && !hasContactDetails && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No further contact details available.
                </p>
              )}
            </div>

            {/* Actions */}
            {(hasLink || hasContactDetails) && (
              <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2 bg-gray-50">
                {hasLink && (
                  <button
                    type="button"
                    onClick={handleClick}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <span>Visiting link</span>
                    <ExternalLinkIcon className="w-5 h-5" />
                  </button>
                )}
                {ad.whatsapp_number && (
                  <button
                    type="button"
                    onClick={handleWhatsAppClick}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </button>
                )}
                {ad.phone_number && (
                  <button
                    type="button"
                    onClick={handlePhoneClick}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
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
                    onClick={handleEmailClick}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
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
      )}
    </div>
  );
}
