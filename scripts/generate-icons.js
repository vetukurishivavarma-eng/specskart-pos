// One-off icon generator -- run with `node scripts/generate-icons.js`. Not part of the app
// bundle; rasterizes the same mark drawn in src/ui/Logo.tsx into the PNGs Expo needs. `sharp`
// is intentionally NOT a project dependency (installed with --no-save when this is run).
const sharp = require('sharp');
const path = require('path');

const BONE = '#f6f3ee';
const INK = '#14110f';
const CLAY = '#b4552d';

// Same two-lens-and-diagonal-bridge mark as Logo.tsx, just inlined as a standalone SVG
// document (react-native-svg's <Path> props don't translate directly to a file sharp can read).
function markSvg({ box, markColor, bgColor, scale = 1, translate = [0, 0] }) {
  const [tx, ty] = translate;
  return `
    <svg width="${box}" height="${box}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${bgColor ? `<rect width="48" height="48" fill="${bgColor}"/>` : ''}
      <g transform="translate(${24 + tx}, ${24 + ty}) scale(${scale}) translate(-24, -24)">
        <path d="M4 20a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"
              stroke="${markColor}" stroke-width="3.4" fill="none"/>
        <path d="M26 20a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"
              stroke="${markColor}" stroke-width="3.4" fill="none"/>
        <path d="M22 19.5 L26 28.5" stroke="${markColor}" stroke-width="3.4" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

async function main() {
  const assets = path.join(__dirname, '..', 'assets');

  // App icon: ink mark on bone, full bleed. The outer <svg viewBox="0 0 48 48"> already maps
  // 48 units to `box` px, so scale here is just extra padding control, not the base mapping.
  await sharp(Buffer.from(markSvg({ box: 1024, markColor: INK, bgColor: BONE, scale: 1 })))
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
