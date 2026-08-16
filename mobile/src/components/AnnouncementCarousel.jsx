import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from './Icons';

export default function AnnouncementCarousel({ announcements = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-swipe every 10 seconds
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [currentIndex, announcements.length]);

  const handleNext = () => {
    if (isTransitioning || announcements.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  const handlePrev = () => {
    if (isTransitioning || announcements.length <= 1) return;
    
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  const goToSlide = (index) => {
    if (isTransitioning || index === currentIndex) return;
    
    setIsTransitioning(true);
    setCurrentIndex(index);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  if (!announcements || announcements.length === 0) return null;

  const current = announcements[currentIndex];

  return (
    <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/20 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent animate-pulse" />
      
      <div className="relative">
        {/* Announcement content with slide animation */}
        <div 
          className={`transition-all duration-500 ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                {current.title}
              </h3>
              <p className="text-sm sm:text-base text-indigo-100 leading-relaxed">
                {current.message}
              </p>
              {current.link_text && current.link_url && (
                <Link
                  to={current.link_url}
                  className="inline-flex items-center gap-1.5 mt-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {current.link_text}
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Navigation arrows for desktop */}
            {announcements.length > 1 && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrev}
                  disabled={isTransitioning}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Previous"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={isTransitioning}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Next"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dots indicator */}
        {announcements.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {announcements.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                disabled={isTransitioning}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide counter (mobile) */}
      {announcements.length > 1 && (
        <div className="sm:hidden absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {currentIndex + 1} / {announcements.length}
        </div>
      )}
    </div>
  );
}
