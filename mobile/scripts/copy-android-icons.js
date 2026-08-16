#!/usr/bin/env node
/**
 * Script to copy Android icons from public folder to Android project
 * Usage: node scripts/copy-android-icons.js [android-project-path]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default paths
const ANDROID_ICONS_SOURCE = path.join(__dirname, '../public/Android Icons');
const ANDROID_PROJECT_PATH = process.argv[2] || path.join(__dirname, '../../android');

const ICON_MAPPING = {
  '48x48.png': 'app/src/main/res/mipmap-mdpi/ic_launcher.png',
  '72x72.png': 'app/src/main/res/mipmap-hdpi/ic_launcher.png',
  '96x96.png': 'app/src/main/res/mipmap-xhdpi/ic_launcher.png',
  '144x144.png': 'app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
  '192x192.png': 'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
};

function copyIcons() {
  console.log('🎨 Copying Android icons...\n');

  // Check if Android project exists
  if (!fs.existsSync(ANDROID_PROJECT_PATH)) {
    console.error(`❌ Android project not found at: ${ANDROID_PROJECT_PATH}`);
    console.log('   Run this script with the Android project path:');
    console.log('   node scripts/copy-android-icons.js /path/to/android/project\n');
    process.exit(1);
  }

  // Check if source icons exist
  if (!fs.existsSync(ANDROID_ICONS_SOURCE)) {
    console.error(`❌ Android icons not found at: ${ANDROID_ICONS_SOURCE}\n`);
    process.exit(1);
  }

  let copiedCount = 0;
  let errorCount = 0;

  // Copy each icon
  for (const [sourceFile, destPath] of Object.entries(ICON_MAPPING)) {
    const sourcePath = path.join(ANDROID_ICONS_SOURCE, sourceFile);
    const destinationPath = path.join(ANDROID_PROJECT_PATH, destPath);

    try {
      // Create directory if it doesn't exist
      const destDir = path.dirname(destinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`✓ ${sourceFile} → ${destPath}`);
      copiedCount++;
    } catch (error) {
      console.error(`✗ Failed to copy ${sourceFile}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📦 Summary:`);
  console.log(`   Copied: ${copiedCount} icons`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount}`);
  }
  console.log('');
}

// Run the script
copyIcons();
