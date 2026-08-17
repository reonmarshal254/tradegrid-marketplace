import { useEffect, useCallback, useRef } from 'react';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';

const PERMISSIONS_ASKED_KEY = 'tg_permissions_asked';

export default function PermissionsRequest({ onDone }) {
  const asked = useRef(false);

  const requestPermissions = useCallback(async () => {
    if (asked.current) return;
    asked.current = true;

    if (localStorage.getItem(PERMISSIONS_ASKED_KEY)) {
      onDone();
      return;
    }

    try {
      // Camera permission (also covers photo library access)
      await Camera.requestPermissions();
    } catch { /* ignore */ }

    try {
      // Filesystem / storage permission
      await Filesystem.requestPermissions();
    } catch { /* ignore */ }

    try {
      // Notification permission (Web API)
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch { /* ignore */ }

    localStorage.setItem(PERMISSIONS_ASKED_KEY, '1');
    onDone();
  }, [onDone]);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  return null;
}
