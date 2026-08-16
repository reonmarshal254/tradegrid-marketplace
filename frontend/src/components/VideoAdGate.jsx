import React from 'react';
import { api } from '../api';
import VideoAdPopup from './VideoAdPopup';
import { MegaphoneIcon } from './Icons';

const STORAGE_KEY = 'tradegrid-video-ad-seen';
const COUNTDOWN_SECONDS = 5;
const CYCLE_DAYS = 31;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dayIndex() {
  return Math.floor(Date.now() / 86400000);
}

// Popups per day so that every ad is shown to every device within the 31-day cycle.
// Few ads (<= 2) are shown every day (2 ads -> 2 popups/day, one each).
// More ads scale the frequency: ceil(N / 31) popups per day guarantees coverage.
function adsPerDayFor(N) {
  if (N <= 2) return N;
  return Math.max(1, Math.ceil(N / CYCLE_DAYS));
}

// Hour of day (from midnight) when a given daily slot fires
function slotHour(k, adsPerDay) {
  return k * (24 / adsPerDay);
}

function loadSeenMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveSeenMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export default function VideoAdGate() {
  const [ads, setAds] = React.useState([]);
  const [pending, setPending] = React.useState(null); // { ad, slotIndex }
  const [countdown, setCountdown] = React.useState(null);
  const [activeAd, setActiveAd] = React.useState(null);
  const fetchingRef = React.useRef(false);
  const scheduledRef = React.useRef(false);

  // Load the full video ad list once
  React.useEffect(() => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.advertisements.getFeaturedVideo();
        if (cancelled || !data?.advertisements?.length) return;
        setAds(data.advertisements);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      fetchingRef.current = false;
      scheduledRef.current = false;
    };
  }, []);

  // Pick the ad due for the current day/slot (deterministic across devices)
  const nextDue = React.useCallback(() => {
    if (!ads.length) return null;
    const N = ads.length;
    const apd = adsPerDayFor(N);
    const map = loadSeenMap();
    const today = todayKey();
    const seenToday = Array.isArray(map[today]) ? map[today] : [];
    const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

    for (let k = 0; k < apd; k++) {
      if (seenToday.includes(k)) continue; // slot already delivered today
      if (nowHour < slotHour(k, apd)) continue; // not time for this slot yet
      const ad = ads[(dayIndex() * apd + k) % N];
      return { ad, slotIndex: k };
    }
    return null;
  }, [ads]);

  // Schedule the countdown once per page load if an ad is due
  React.useEffect(() => {
    if (!ads.length || scheduledRef.current || pending || countdown !== null || activeAd) return;
    const due = nextDue();
    if (due) {
      scheduledRef.current = true;
      setPending(due);
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [ads, pending, countdown, activeAd, nextDue]);

  // Countdown ticker -> opens the popup
  React.useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (pending) {
        const map = loadSeenMap();
        const today = todayKey();
        const seenToday = Array.isArray(map[today]) ? map[today] : [];
        if (!seenToday.includes(pending.slotIndex)) {
          map[today] = [...seenToday, pending.slotIndex];
          saveSeenMap(map);
        }
        api.advertisements.recordView(pending.ad.id).catch(() => {});
        setActiveAd(pending.ad);
        setPending(null);
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, pending]);

  if (activeAd) {
    return (
      <VideoAdPopup
        key={activeAd.id}
        ad={activeAd}
        onClose={() => setActiveAd(null)}
      />
    );
  }

  if (pending && countdown !== null && countdown > 0) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-indigo-600 text-white pl-3 pr-4 py-2.5 rounded-full shadow-xl shadow-indigo-900/30 animate-in slide-in-from-bottom-2 duration-300">
        <span className="relative flex h-8 w-8 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/20" />
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <MegaphoneIcon className="h-4 w-4" />
          </span>
        </span>
        <div className="text-sm font-semibold leading-tight">
          Ad in <span className="tabular-nums">{countdown}s</span>
        </div>
      </div>
    );
  }

  return null;
}
