import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import FrameSell from '../../src/components/FrameSell'
import LensSell from '../../src/components/LensSell'
import { colors, spacing } from '../../src/theme'
import { Select, Title } from '../../src/ui/components'

const MODES = [
  { value: 'LENS', label: 'Lens' },
  { value: 'FRAME', label: 'Frame' },
] as const

export default function Sell() {
  const [mode, setMode] = useState<string>('LENS')

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <Title>New sale</Title>
      <Text style={{ color: colors.textMuted, marginTop: 2 }}>Bill a walk-in customer at the counter</Text>

      <View style={{ marginTop: spacing.lg }}>
        <Select value={mode} options={MODES as any} onChange={setMode} />
      </View>

      {mode === 'LENS' ? <LensSell /> : <FrameSell />}
    </ScrollView>
  )
}
