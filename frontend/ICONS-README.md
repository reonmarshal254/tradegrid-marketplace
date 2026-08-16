# TRADEGRID Icons Setup

This document explains the icon setup for TRADEGRID marketplace across web and Android platforms.

## Icon Folders Structure

```
public/
├── favicon.svg                 # Main SVG favicon
├── Favicons/                   # Web favicons (various sizes)
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-192x192.png
│   └── ... (21 total sizes)
├── Android Icons/              # Android launcher icons
│   ├── 48x48.png   (mdpi)
│   ├── 72x72.png   (hdpi)
│   ├── 96x96.png   (xhdpi)
│   ├── 144x144.png (xxhdpi)
│   └── 192x192.png (xxxhdpi)
└── Chrome Store/               # Chrome extension icons
    ├── 16x16.png
    ├── 48x48.png
    └── 128x128.png
```

## Web Platform Setup

### PWA (Progressive Web App)
The `manifest.json` file configures the app for installation on mobile devices and desktop:
- **App Name**: TRADEGRID Marketplace
- **Theme Color**: #4f46e5 (Indigo)
- **Display Mode**: Standalone
- **Icons**: Uses Favicons folder for all sizes

### Browser Support
- **Standard Browsers**: Uses favicons from 16x16 to 192x192
- **Apple Devices**: Apple Touch Icons for iOS home screen
- **Microsoft**: Windows tiles configured via `browserconfig.xml`

## Android Platform Setup

### Icon Densities
Android uses different icon sizes for different screen densities:

| Density | Size    | File              | DPI      |
|---------|---------|-------------------|----------|
| mdpi    | 48x48   | 48x48.png         | ~160dpi  |
| hdpi    | 72x72   | 72x72.png         | ~240dpi  |
| xhdpi   | 96x96   | 96x96.png         | ~320dpi  |
| xxhdpi  | 144x144 | 144x144.png       | ~480dpi  |
| xxxhdpi | 192x192 | 192x192.png       | ~640dpi  |

### Copying Icons to Android Project

**Automatic Method:**
```bash
node scripts/copy-android-icons.js /path/to/android/project
```

**Manual Method:**
Copy files from `public/Android Icons/` to your Android project:
```
48x48.png   → android/app/src/main/res/mipmap-mdpi/ic_launcher.png
72x72.png   → android/app/src/main/res/mipmap-hdpi/ic_launcher.png
96x96.png   → android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
144x144.png → android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
192x192.png → android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

### Android Manifest Configuration

Add this to your `AndroidManifest.xml`:
```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:label="TRADEGRID"
    android:theme="@style/AppTheme">
```

### Adaptive Icons (Android 8.0+)

For modern Android, create adaptive icons:
1. Create `ic_launcher_foreground.xml` using the 192x192.png
2. Create `ic_launcher_background.xml` with color #4f46e5
3. Reference them in `ic_launcher.xml`

## Chrome Extension

If creating a Chrome extension, use icons from `Chrome Store/`:
```json
{
  "icons": {
    "16": "icons/16x16.png",
    "48": "icons/48x48.png",
    "128": "icons/128x128.png"
  }
}
```

## Updating Icons

When you need to update icons:

1. **Generate new icons** at required sizes
2. **Replace files** in respective folders
3. **For web**: Clear browser cache to see changes
4. **For Android**: 
   - Run the copy script
   - Clean and rebuild the Android project
   - Uninstall old app before testing

## Icon Guidelines

- **Format**: PNG with transparency
- **Background**: Icons should work on any background color
- **Shape**: Square with rounded corners (Android handles rounding)
- **Content**: Simple, recognizable symbol
- **Colors**: Match brand colors (#4f46e5 primary)

## Testing

### Web
- Test in Chrome DevTools (Application > Manifest)
- Install as PWA and check home screen icon
- Test on iOS Safari (Add to Home Screen)

### Android
- Test on multiple devices with different screen densities
- Check in app drawer and home screen
- Verify adaptive icon behavior (Android 8+)

## Brand Colors

- **Primary**: #4f46e5 (Indigo 600)
- **Secondary**: #8b5cf6 (Violet 500)
- **Background**: #ffffff (White)
- **Text**: #111827 (Gray 900)
