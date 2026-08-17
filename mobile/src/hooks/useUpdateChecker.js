import { useState, useEffect, useCallback } from 'react';
import { App } from '@capacitor/app';
import { api } from '../api';

export function useUpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checking, setChecking] = useState(true);

  const checkForUpdate = useCallback(async () => {
    try {
      const info = await App.getInfo();
      const currentCode = info.versionCode;
      const res = await api.admin.latestAppVersion();
      const latest = res.version;
      if (latest && latest.version_code > currentCode) {
        setUpdateInfo({
          versionName: latest.version_name,
          versionCode: latest.version_code,
          releaseNotes: latest.release_notes,
          apkUrl: latest.download_url || latest.apk_url,
          fileSize: latest.file_size,
        });
      }
    } catch {
      /* ignore — user might not be logged in or server unreachable */
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const dismiss = useCallback(() => setUpdateInfo(null), []);

  return { updateInfo, checking, dismiss, recheck: checkForUpdate };
}
