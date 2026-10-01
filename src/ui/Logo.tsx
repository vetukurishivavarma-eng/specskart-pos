import Svg, { Path } from 'react-native-svg'

/**
 * Specskart's mark (2026-10 redraw): a modern browline frame -- one heavy brow bar over thin
 * tapered lenses and a keyhole bridge -- with a lime glint of light on the right lens. The glint is
 * the brand's signature; everything else stays one colour.
 *
 * Keep in step with scripts/mark-svg.js, which draws the same paths for the launcher icons.
 *
 * @param color  the frame.
 * @param accent the glint. Lime by default -- only legible on dark/cobalt backgrounds.
 */
export const MARK = {
  left: 'M5 18.5 H21.5 C21.5 25.5 20 30.5 14.6 30.5 H11.6 C7 30.5 5.6 26 5 18.5 Z',
  right: 'M43 18.5 H26.5 C26.5 25.5 28 30.5 33.4 30.5 H36.4 C41 30.5 42.4 26 43 18.5 Z',
  brow: 'M2.5 18 H45.5',
  bridge: 'M21.5 22.4 Q24 19.8 26.5 22.4',
  glint: 'M30.4 25.6 Q30.8 22.6 33.6 22',
}

export function Logo({ size = 40, color = '#0A0F1F', accent = '#C8F04B' }: { size?: number; color?: string; accent?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d={MARK.left} stroke={color} strokeWidth={2.6} strokeLinejoin="round" />
      <Path d={MARK.right} stroke={color} strokeWidth={2.6} strokeLinejoin="round" />
      <Path d={MARK.brow} stroke={color} strokeWidth={4.2} strokeLinecap="round" />
      <Path d={MARK.bridge} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Path d={MARK.glint} stroke={accent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}
