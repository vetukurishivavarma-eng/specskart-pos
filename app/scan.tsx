import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useScanCapture } from '../src/lib/scanCapture'
import { colors, font, radius, spacing } from '../src/theme'
import { Button, Icon } from '../src/ui/components'

export default function Scan() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const capture = useScanCapture((s) => s.capture)
  const busy = useRef(false)

  function onScanned(data: string) {
    if (busy.current) return
    busy.current = true
    capture(data)
    router.back()
  }

  if (!permission) return <View style={styles.fill} />

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Icon name="camera-off" size={28} color={colors.accent} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permHint}>Specskart POS uses the camera to scan product barcodes.</Text>
        <Button label="Grant access" onPress={requestPermission} style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    )
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        onBarcodeScanned={({ data }) => onScanned(data)}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.hint}>Point at a product barcode</Text>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Icon name="x" size={20} color={colors.text} />
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}

const CORNER = 30

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.ink },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permTitle: { fontFamily: font.bold, fontSize: 19, color: colors.onDark, marginTop: spacing.lg },
  permHint: { fontFamily: font.regular, fontSize: 14, color: colors.onDarkMuted, textAlign: 'center', marginTop: spacing.sm, maxWidth: 300 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reticle: { width: 268, height: 172 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  hint: { fontFamily: font.semibold, fontSize: 14, color: colors.onDark, marginTop: spacing.xl, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: spacing.xl, alignItems: 'center' },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  closeText: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
})
