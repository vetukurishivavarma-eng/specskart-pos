// The Specskart mark as a standalone SVG document, shared by both icon generators.
//
// It lives here because it used to live in both of them, and a redraw updated one copy: the
// in-app logo and assets/icon.png changed, the per-density launcher icons did not, and the
// APK shipped the old mark on the home screen. Two copies of the same artwork will always
// drift; one copy cannot.
//
// This still mirrors src/ui/Logo.tsx by hand — react-native-svg's <Rect>/<Path> props don't
// translate to a file sharp can read. Change one, change the other.
const BONE = '#f6f3ee';
const INK = '#14110f';
const CLAY = '#b4552d';

/**
 * @param box       output size in px
 * @param markColor the dominant tone; the right lens is drawn at 50% of it
 * @param bgColor   a filled backdrop, or null for transparent (adaptive foregrounds)
 * @param scale     shrinks the mark within the box — adaptive foregrounds need padding for
 *                  the launcher's mask
 * @param translate optional [x, y] nudge, in viewBox units
 */
function markSvg({ box, markColor, bgColor, scale = 1, translate = [0, 0] }) {
  const [tx, ty] = translate;
  return `
    <svg width="${box}" height="${box}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${bgColor ? `<rect width="48" height="48" fill="${bgColor}"/>` : ''}
      <g transform="translate(${24 + tx}, ${24 + ty}) scale(${scale}) translate(-24, -24)">
        <rect x="4" y="16" width="15" height="15" rx="5.5" fill="none" stroke="${markColor}" stroke-width="4.2"/>
        <rect x="29" y="16" width="15" height="15" rx="5.5" fill="none" stroke="${markColor}" stroke-width="4.2" opacity="0.5"/>
        <path d="M20.5 20.5 L27.5 27" stroke="${markColor}" stroke-width="4.2" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

module.exports = { markSvg, BONE, INK, CLAY };
