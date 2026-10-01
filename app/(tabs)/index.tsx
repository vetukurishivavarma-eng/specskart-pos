import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import FrameSell from '../../src/components/FrameSell'
import LensSell from '../../src/components/LensSell'
import { colors, font, radius, spacing } from '../../src/theme'
import { Icon, type IconName, Title } from '../../src/ui/components'

// Frames and lenses are equal citizens at the counter -- a segmented switch, not a dropdown,
// so neither one hides behind the other.
const MODES: { value: 'LENS' | 'FRAME'; label: string; icon: IconName }[] = [
  { value: 'LENS', label: 'Lenses', icon: 'aperture' },
  { value: 'FRAME', label: 'Frames', icon: 'eye' },
]

export default function Sell() {
  const [mode, setMode] = useState<'LENS' | 'FRAME'>('LENS')

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <Title>New sale</Title>
      <Text style={{ fontFamily: font.regular, color: colors.textMuted, marginTop: 2 }}>
        Bill frames or lenses at the counter — discounts on both
      </Text>

      <View
        style={{
          flexDirection: 'row',
          marginTop: spacing.lg,
          padding: 4,
          gap: 4,
          borderRadius: radius.lg,
          backgroundColor: colors.surfaceSunken,
        }}
      >
        {MODES.map((m) => {
          const on = mode === m.value
          return (
            <Pressable
              key={m.value}
              onPress={() => setMode(m.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                height: 46,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: on ? colors.primary : 'transparent',
              }}
            >
              <Icon name={m.icon} size={17} color={on ? '#fff' : colors.textMuted} />
              <Text style={{ fontFamily: font.display, fontSize: 16, color: on ? '#fff' : colors.textMuted }}>{m.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {mode === 'LENS' ? <LensSell /> : <FrameSell />}
    </ScrollView>
  )
}
