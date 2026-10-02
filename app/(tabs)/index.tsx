import { ScrollView, Text } from 'react-native'
import CounterSale from '../../src/components/CounterSale'
import { colors, font, spacing } from '../../src/theme'
import { Title } from '../../src/ui/components'

export default function Sell() {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
      <Title>New sale</Title>
      <Text style={{ fontFamily: font.regular, color: colors.textMuted, marginTop: 2 }}>
        Frames, lenses or both — one bill, one discount
      </Text>
      <CounterSale />
    </ScrollView>
  )
}
