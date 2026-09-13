#!/usr/bin/env node
// Run after `expo prebuild`, before the Gradle build (see .github/workflows/build-apk.yml).
// Overwrites whatever launcher icon `expo prebuild` generated with our own pre-rendered PNGs
// (assets/android-icons/, built by generate-android-icons.js) -- see that script's header
// comment for why: Expo's own icon-resize step failed silently in CI once, shipping the
// stock Android robot icon with no build error. This removes the dependency on that step
// working correctly in whatever environment the build happens to run in.
const fs = require('fs');
const path = require('path');

const sourceRoot = path.join(__dirname, '..', 'assets', 'android-icons');
const resRoot = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const NAMES = ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground'];

for (const density of DENSITIES) {
  const destDir = path.join(resRoot, `mipmap-${density}`);
  if (!fs.existsSync(destDir)) {
    throw new Error(`${destDir} doesn't exist -- did expo prebuild run first?`);
  }
  for (const name of NAMES) {
    // Same resource name, different extension (.webp -> .png) is fine for Android resource
    // resolution (keyed by name, not extension) -- but both files existing at once for the
    // same name+qualifier is a build error, so the old one has to go.
    const staleWebp = path.join(destDir, `${name}.webp`);
    if (fs.existsSync(staleWebp)) fs.unlinkSync(staleWebp);
    fs.copyFileSync(path.join(sourceRoot, density, `${name}.png`), path.join(destDir, `${name}.png`));
  }
}

console.log('Replaced generated launcher icons with assets/android-icons/.');
