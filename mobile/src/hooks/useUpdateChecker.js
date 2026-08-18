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
      console.log('[update] installed versionCode:', currentCode);

      const res = await api.admin.latestAppVersion();
      console.log('[update] server response:', JSON.stringify(res));

      const latest = res.version;
      if (!latest) {
        console.log('[update] no version found on server');
        return;
      }

      console.log('[update] latest version_code:', latest.version_code, 'vs installed:', currentCode);

      if (latest.version_code > currentCode) {
        console.log('[update] update available! Setting updateInfo');
        setUpdateInfo({
          versionName: latest.version_name,
          versionCode: latest.version_code,
          releaseNotes: latest.release_notes,
          apkUrl: latest.download_url || latest.apk_url,
          fileSize: latest.file_size,
        });
      } else {
        console.log('[update] app is up to date');
      }
    } catch (err) {
      console.error('[update] check failed:', err.message);
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
