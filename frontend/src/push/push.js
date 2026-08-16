import { api } from '../api';

const SW_PATH = '/sw.js';

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH);
    return reg;
  } catch (err) {
    console.error('[push] service worker registration failed', err);
    return null;
  }
}

async function getVapidKey() {
  try {
    const { public_key, configured } = await api.push.vapidPublicKey();
    return configured ? public_key : null;
  } catch {
    return null;
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) return { enabled: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { enabled: false, reason: 'denied' };
  }

  const reg = await registerServiceWorker();
  if (!reg) return { enabled: false, reason: 'no-sw' };

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    try {
      await api.push.subscribe({
        endpoint: existing.endpoint,
        keys: existing.toJSON().keys,
      });
    } catch (err) {
      console.error('[push] subscribe sync failed', err);
    }
    return { enabled: true };
  }

  const publicKey = await getVapidKey();
  if (!publicKey) return { enabled: false, reason: 'no-key' };

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  try {
    await api.push.subscribe({
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
    });
    return { enabled: true };
  } catch (err) {
    console.error('[push] subscribe failed', err);
    return { enabled: false, reason: 'server' };
  }
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.push.unsubscribe(sub.endpoint);
      await sub.unsubscribe();
    }
  } catch (err) {
    console.error('[push] unsubscribe failed', err);
  }
}

export function supportsAppBadge() {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
}

// Shows a notification dot/count on the installed app icon (PWA on mobile).
export async function syncAppBadge(count) {
  if (!supportsAppBadge()) return;
  try {
    if (count > 0) {
      await navigator.setAppBadge(count);
    } else if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
    }
  } catch (err) {
    console.error('[push] badge update failed', err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
