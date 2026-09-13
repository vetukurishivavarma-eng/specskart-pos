import Svg, { Path } from 'react-native-svg'

/**
 * Specskart's mark — original geometric artwork drawn for this app, not copied or traced
 * from anywhere. Two lens shapes on a bridge, with the bridge itself cut on a diagonal so it
 * doubles as a monogram "S" stroke running through the mark. Single-color line art so it
 * tints with whatever `color` the screen needs (accent on the login card, bone on the dark
 * wash, ink in a light header).
 */
export function Logo({ size = 40, color = '#14110f' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* Left lens */}
      <Path
        d="M4 20a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"
        stroke={color}
        strokeWidth={3.4}
      />
      {/* Right lens */}
      <Path
        d="M26 20a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h-6a6 6 0 0 1-6-6z"
        stroke={color}
        strokeWidth={3.4}
      />
      {/* Bridge, cut on the diagonal -- the "S" stroke running through the mark */}
      <Path d="M22 19.5 L26 28.5" stroke={color} strokeWidth={3.4} strokeLinecap="round" />
    </Svg>
  )
}
