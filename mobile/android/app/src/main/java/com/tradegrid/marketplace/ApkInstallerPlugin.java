package com.tradegrid.marketplace;

import android.content.Intent;
import android.net.Uri;
import android.os.Environment;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        // Run download on background thread
        new Thread(() -> {
            try {
                // Get cache directory
                File cacheDir = getContext().getCacheDir();
                File apkFile = new File(cacheDir, "tradegrid-update.apk");

                // Download APK
                URL downloadUrl = new URL(url);
                HttpURLConnection connection = (HttpURLConnection) downloadUrl.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(30000);
                connection.setReadTimeout(60000);
                connection.connect();

                if (connection.getResponseCode() != 200) {
                    call.reject("Download failed with code " + connection.getResponseCode());
                    return;
                }

                InputStream inputStream = connection.getInputStream();
                FileOutputStream outputStream = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                int bytesRead;
                long totalBytes = 0;
                int contentLength = connection.getContentLength();

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                    totalBytes += bytesRead;

                    // Emit progress
                    JSObject progress = new JSObject();
                    progress.put("bytesReceived", totalBytes);
                    progress.put("totalBytes", contentLength);
                    notifyListeners("downloadProgress", progress);
                }

                outputStream.flush();
                outputStream.close();
                inputStream.close();
                connection.disconnect();

                // Get content URI via FileProvider
                Uri contentUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );

                // Open APK with package installer
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                getActivity().startActivity(intent);

                // Return success
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("filePath", apkFile.getAbsolutePath());
                call.resolve(result);

            } catch (Exception e) {
                call.reject("Install failed: " + e.getMessage(), e);
            }
        }).start();
    }
}
