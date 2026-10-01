// The Specskart mark as a standalone SVG document, shared by both icon generators.
// Mirrors src/ui/Logo.tsx (same paths) -- change one, change the other.
//
// 2026-10 redraw: browline frame (heavy brow bar, thin tapered lenses, keyhole bridge) and a lime
// glint on the right lens. Launcher icon = white frame + lime glint on a cobalt tile.
const COBALT = '#2342F0';
const WHITE = '#FFFFFF';
const LIME = '#C8F04B';

const MARK = {
  left: 'M5 18.5 H21.5 C21.5 25.5 20 30.5 14.6 30.5 H11.6 C7 30.5 5.6 26 5 18.5 Z',
  right: 'M43 18.5 H26.5 C26.5 25.5 28 30.5 33.4 30.5 H36.4 C41 30.5 42.4 26 43 18.5 Z',
  brow: 'M2.5 18 H45.5',
  bridge: 'M21.5 22.4 Q24 19.8 26.5 22.4',
  glint: 'M30.4 25.6 Q30.8 22.6 33.6 22',
};

/**
 * @param box       output size in px
 * @param markColor the frame colour
 * @param glint     the glint colour
 * @param bgColor   a filled backdrop, or null for transparent (adaptive foregrounds)
 * @param scale     shrinks the mark within the box -- adaptive foregrounds need padding for the mask
 */
function markSvg({ box, markColor = WHITE, glint = LIME, bgColor, scale = 1, translate = [0, 0] }) {
  const [tx, ty] = translate;
  return `
    <svg width="${box}" height="${box}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${bgColor ? `<rect width="48" height="48" fill="${bgColor}"/>` : ''}
      <g transform="translate(${24 + tx}, ${24 + ty}) scale(${scale}) translate(-24, -24)" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="${MARK.left}" stroke="${markColor}" stroke-width="2.6"/>
        <path d="${MARK.right}" stroke="${markColor}" stroke-width="2.6"/>
        <path d="${MARK.brow}" stroke="${markColor}" stroke-width="4.2"/>
        <path d="${MARK.bridge}" stroke="${markColor}" stroke-width="2.6"/>
        <path d="${MARK.glint}" stroke="${glint}" stroke-width="2"/>
      </g>
    </svg>
  `;
}

module.exports = { markSvg, MARK, COBALT, WHITE, LIME };
