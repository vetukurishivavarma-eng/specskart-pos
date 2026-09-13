#!/usr/bin/env node
// `expo prebuild` regenerates android/app/build.gradle from scratch every run (it's
// gitignored, not committed) with only a debug signingConfig. This patches in a release
// one that reads from android/gradle.properties -- see .github/workflows/build-apk.yml,
// which writes those properties from repo secrets before running gradlew.
//
// ponytail: string-patches Expo's generated template rather than a config plugin. Simpler,
// but fragile if a future Expo SDK changes this exact template -- if `expo prebuild` starts
// failing this script, diff android/app/build.gradle's signingConfigs/buildTypes.release
// blocks against what's matched below and update it.
const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let content = fs.readFileSync(gradlePath, 'utf8');

const debugSigningBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const withRelease = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(project.property('MYAPP_RELEASE_STORE_FILE'))
            storePassword project.property('MYAPP_RELEASE_STORE_PASSWORD')
            keyAlias project.property('MYAPP_RELEASE_KEY_ALIAS')
            keyPassword project.property('MYAPP_RELEASE_KEY_PASSWORD')
        }
    }`;

if (!content.includes(debugSigningBlock)) {
  throw new Error('android/app/build.gradle signingConfigs block did not match the expected template -- see the comment at the top of this script.');
}
content = content.replace(debugSigningBlock, withRelease);

const debugReleaseSigning = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;
const realReleaseSigning = `        release {
            signingConfig signingConfigs.release`;

if (!content.includes(debugReleaseSigning)) {
  throw new Error('android/app/build.gradle release buildType did not match the expected template -- see the comment at the top of this script.');
}
content = content.replace(debugReleaseSigning, realReleaseSigning);

fs.writeFileSync(gradlePath, content);
console.log('Patched android/app/build.gradle with release signing config.');
