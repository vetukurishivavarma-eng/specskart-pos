import Svg, { Circle, Path } from 'react-native-svg'

/**
 * Specskart's mark — original geometric artwork drawn for this app, not copied or traced from
 * anywhere. Two round lenses, a bridge seated between the rims, and a hinge stub on each side.
 *
 * Round, not squircles: a rounded rectangle at icon size reads as a button, and two side by
 * side read as two buttons. The bridge sits *between* the rims and rises over them, the way a
 * real frame does — an earlier version ran a diagonal straight through both lenses, which read
 * as a slash cancelling them out rather than as eyewear.
 *
 * Keep in step with scripts/mark-svg.js, which draws the same thing for the launcher icons.
 *
 * @param color the dominant tone — left lens, bridge, left hinge.
 * @param accent the second tone for the right side. Defaults to `color` at 55%, which works on
 *               any background without the caller having to pick a matching pair.
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
  const second = accent ?? color
  const secondOpacity = accent ? 1 : 0.55
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx={14} cy={25} r={8} stroke={color} strokeWidth={3.6} />
      <Circle cx={34} cy={25} r={8} stroke={second} strokeWidth={3.6} opacity={secondOpacity} />
      {/* Bridge — spans rim to rim (22 → 26) and arcs above them. */}
      <Path d="M22 22.5 Q24 18.4 26 22.5" stroke={color} strokeWidth={3.6} strokeLinecap="round" />
      {/* Hinges, so the mark reads as a frame rather than two circles. */}
      <Path d="M6 22.6 L2.6 20.2" stroke={color} strokeWidth={3.6} strokeLinecap="round" />
      <Path
        d="M42 22.6 L45.4 20.2"
        stroke={second}
        strokeWidth={3.6}
        strokeLinecap="round"
        opacity={secondOpacity}
      />
    </Svg>
  )
}
