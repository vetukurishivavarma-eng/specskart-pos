import Svg, { Path, Rect } from 'react-native-svg'

/**
 * Specskart's mark — original geometric artwork drawn for this app, not copied or traced from
 * anywhere. Two lens shapes on a bridge, with the bridge cut on a diagonal so it doubles as a
 * monogram "S" stroke running through the mark.
 *
 * Redrawn as solid two-tone: the thin 3.4px outline read as grey mush below about 40px, which
 * is exactly the size it appears at in the header and the launcher icon. Filled shapes hold
 * their shape at any size, and the right lens carrying a lighter tone keeps the two from
 * merging into one blob the way two identical filled rectangles would.
 *
 * @param color the dominant tone — left lens and bridge.
 * @param accent the second tone for the right lens. Defaults to `color` at 45%, which works on
 *               any background without the caller having to pick a matching pair; pass one
 *               explicitly where the brand's own terracotta is wanted.
 */
export function Logo({
  size = 40,
  color = '#14110f',
  accent,
}: {
  size?: number
  color?: string
  accent?: string
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Left lens */}
      <Rect x={4} y={16} width={15} height={15} rx={5.5} stroke={color} strokeWidth={4.2} />
      {/* Right lens — the second tone, so the pair reads as two and not one wide bar. */}
      <Rect
        x={29}
        y={16}
        width={15}
        height={15}
        rx={5.5}
        stroke={accent ?? color}
        strokeWidth={4.2}
        opacity={accent ? 1 : 0.5}
      />
      {/* Bridge: the diagonal that doubles as the monogram's S stroke. */}
      <Path d="M20.5 20.5 L27.5 27" stroke={color} strokeWidth={4.2} strokeLinecap="round" />
    </Svg>
  )
}
