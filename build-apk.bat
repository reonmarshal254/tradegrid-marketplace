@echo off
setlocal

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot
set PROJECT_ROOT=%~dp0
set MOBILE_DIR=%PROJECT_ROOT%mobile

echo.
echo === Cleaning stale Gradle daemons ===
taskkill /F /IM java.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo === Building mobile frontend ===
call npm run build --prefix "%MOBILE_DIR%"
if errorlevel 1 (
    echo Frontend build failed!
    exit /b 1
)

echo.
echo === Syncing Capacitor ===
pushd "%MOBILE_DIR%"
call npx cap sync android
popd
if errorlevel 1 (
    echo Capacitor sync failed!
    exit /b 1
)

echo.
echo === Building debug APK ===
call "%MOBILE_DIR%\android\gradlew.bat" -p "%MOBILE_DIR%\android" assembleDebug --no-daemon
if errorlevel 1 (
    echo APK build failed!
    exit /b 1
)

set APK_PATH=%MOBILE_DIR%\android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo === Done! APK at: %APK_PATH% ===
