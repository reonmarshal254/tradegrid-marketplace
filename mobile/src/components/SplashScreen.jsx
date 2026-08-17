import React, { useEffect, useState } from 'react';
import { App } from '@capacitor/app';

export default function SplashScreen({ onComplete }) {
  const [version, setVersion] = useState('');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    App.getInfo().then((info) => {
      setVersion(`v${info.version}`);
    }).catch(() => {});

    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    const doneTimer = setTimeout(() => onComplete(), 2300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-800 via-indigo-600 to-violet-700 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl ring-1 ring-white/30">
          <span className="text-3xl font-black text-white tracking-tight">TG</span>
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-wider">TRADEGRID</h1>
          <p className="text-indigo-200 text-sm mt-1">Buy &amp; sell pre-owned items</p>
        </div>

        {/* Version */}
        {version && (
          <span className="text-xs text-indigo-300/70 font-medium mt-2">{version}</span>
        )}

        {/* Loading indicator */}
        <div className="mt-6 flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
