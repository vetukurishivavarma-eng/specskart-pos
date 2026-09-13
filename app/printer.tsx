import { ScrollView, Text, View } from 'react-native'
import { colors, font, spacing } from '../src/theme'
import { Card, Icon, Subtitle, Title } from '../src/ui/components'

/** No Bluetooth ESC/POS pairing here (unlike NG POS's ​bt-printer module) -- receipts print
 *  through expo-print, which hands the job to whatever the OS already knows how to reach
 *  (a paired Bluetooth/Wi-Fi printer via the Android print service, AirPrint on iOS, or
 *  "Save as PDF"). Nothing to pair or configure in-app; this screen just explains that. */
export default function Printer() {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Title>Printing</Title>
      <Card style={{ gap: spacing.sm, flexDirection: 'row' }}>
        <Icon name="printer" size={20} color={colors.primary} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>
            No pairing needed
          </Text>
          <Subtitle style={{ marginTop: 0 }}>
            "Print receipt" opens the device's own print sheet. Pick any receipt printer set up
            on this device's Android print service, or save the receipt as a PDF to share it.
          </Subtitle>
        </View>
      </Card>
      <Card style={{ gap: spacing.xs }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>To add a printer</Text>
        <Subtitle style={{ marginTop: 0 }}>
          Install the printer manufacturer's print-service app from the Play Store, then pair it
          from Android Settings → Connected devices → Connection preferences → Printing.
        </Subtitle>
      </Card>
    </ScrollView>
  )
}
