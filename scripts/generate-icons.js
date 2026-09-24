// One-off icon generator -- run with `node scripts/generate-icons.js`. Not part of the app
// bundle; rasterizes the same mark drawn in src/ui/Logo.tsx into the PNGs Expo needs. `sharp`
// is intentionally NOT a project dependency (installed with --no-save when this is run).
const sharp = require('sharp');
const path = require('path');
const { markSvg, BONE, INK, CLAY } = require('./mark-svg');



async function main() {
  const assets = path.join(__dirname, '..', 'assets');

  // App icon: ink mark on bone, full bleed. The outer <svg viewBox="0 0 48 48"> already maps
  // 48 units to `box` px, so scale here is just extra padding control, not the base mapping.
  await sharp(Buffer.from(markSvg({ box: 1024, markColor: CLAY, bgColor: BONE, scale: 1 })))
    .png()
    .toFile(path.join(assets, 'icon.png'));

  // Adaptive icon foreground: transparent background, mark shrunk to sit inside Android's
  // safe zone (the middle ~66% of the canvas -- the outer ~1/6 on each side gets masked/
  // cropped differently per launcher).
  await sharp(Buffer.from(markSvg({ box: 1024, markColor: CLAY, bgColor: null, scale: 0.6 })))
    .png()
    .toFile(path.join(assets, 'adaptive-icon.png'));

  console.log('Wrote assets/icon.png and assets/adaptive-icon.png');
}

main().catch((e) => { console.error(e); process.exit(1); });
