// Renders the launcher icon at every Android density bucket and commits the results as
// static PNGs under assets/android-icons/. Run with `node scripts/generate-android-icons.js`
// (needs `sharp`, installed with --no-save when this is run -- see generate-icons.js).
//
// Why this exists, separate from generate-icons.js's assets/icon.png + adaptive-icon.png:
// Expo's own `expo prebuild` bakes those two 1024px masters down into per-density mipmap
// files using its own internal image-resize pipeline (also sharp-based) at *build* time --
// and that step failed silently on the GitHub Actions runner (CI build produced a real APK
// with the stock Android/Expo template icon, no error surfaced). Pre-rendering every density
// ourselves and copying the files in post-prebuild (see apply-android-icons.js) removes that
// dependency on Expo's pipeline working correctly in whatever environment CI happens to run.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BONE = '#f6f3ee';
const INK = '#14110f';
const CLAY = '#b4552d';

function markSvg({ box, markColor, bgColor, scale = 1 }) {
  return `
    <svg width="${box}" height="${box}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${bgColor ? `<rect width="48" height="48" fill="${bgColor}"/>` : ''}
      <g transform="translate(24, 24) scale(${scale}) translate(-24, -24)">
        <path d="M4 20a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"
              stroke="${markColor}" stroke-width="3.4" fill="none"/>
        <path d="M26 20a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"
              stroke="${markColor}" stroke-width="3.4" fill="none"/>
        <path d="M22 19.5 L26 28.5" stroke="${markColor}" stroke-width="3.4" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

// Legacy launcher icon (and round variant, reused as-is -- same square mark, no separate
// circle crop) is full-bleed at these sizes. Adaptive foreground sits in a 108dp canvas
// where only the middle ~66% is guaranteed visible, hence the smaller scale + bigger canvas.
const DENSITIES = {
  mdpi: { legacy: 48, adaptive: 108 },
  hdpi: { legacy: 72, adaptive: 162 },
  xhdpi: { legacy: 96, adaptive: 216 },
  xxhdpi: { legacy: 144, adaptive: 324 },
  xxxhdpi: { legacy: 192, adaptive: 432 },
};

async function main() {
  const outRoot = path.join(__dirname, '..', 'assets', 'android-icons');
  fs.rmSync(outRoot, { recursive: true, force: true });

  for (const [density, sizes] of Object.entries(DENSITIES)) {
    const dir = path.join(outRoot, density);
    fs.mkdirSync(dir, { recursive: true });

    const legacy = sharp(Buffer.from(markSvg({ box: sizes.legacy, markColor: INK, bgColor: BONE, scale: 1 }))).png();
    await legacy.clone().toFile(path.join(dir, 'ic_launcher.png'));
    await legacy.clone().toFile(path.join(dir, 'ic_launcher_round.png'));

    await sharp(Buffer.from(markSvg({ box: sizes.adaptive, markColor: CLAY, bgColor: null, scale: 0.6 })))
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  console.log('Wrote assets/android-icons/{density}/{ic_launcher,ic_launcher_round,ic_launcher_foreground}.png');
}

main().catch((e) => { console.error(e); process.exit(1); });
