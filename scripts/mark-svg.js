// The Specskart mark as a standalone SVG document, shared by both icon generators.
//
// It lives here because it used to live in both of them, and a redraw updated one copy: the
// in-app logo and assets/icon.png changed, the per-density launcher icons did not, and the
// APK shipped the old mark on the home screen. Two copies of the same artwork will always
// drift; one copy cannot.
//
// This still mirrors src/ui/Logo.tsx by hand — react-native-svg's <Circle>/<Path> props don't
// translate to a file sharp can read. Change one, change the other.
//
// The drawing: two circular lenses joined by a raised bridge, with the temple arm sweeping off
// the right lens. Round beats the earlier squircles — a rounded rectangle at icon size reads as
// a button, and two of them side by side read as two buttons. The bridge sits *between* the
// rims and rises over them, which is what a real frame does; the previous version ran a
// diagonal straight through both lenses, which read as a slash cancelling them out.
const BONE = '#f6f3ee';
const INK = '#14110f';
const CLAY = '#b4552d';

/**
 * @param box       output size in px
 * @param markColor the dominant tone; the right lens is drawn at 55% of it
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
      <g transform="translate(${24 + tx}, ${24 + ty}) scale(${scale}) translate(-24, -24)"
         fill="none" stroke="${markColor}" stroke-width="3.6" stroke-linecap="round">
        <circle cx="14" cy="25" r="8"/>
        <circle cx="34" cy="25" r="8" opacity="0.55"/>
        <path d="M22 22.5 Q24 18.4 26 22.5"/>
        <path d="M6 22.6 L2.6 20.2"/>
        <path d="M42 22.6 L45.4 20.2" opacity="0.55"/>
      </g>
    </svg>
  `;
}

module.exports = { markSvg, BONE, INK, CLAY };
