import { StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '../theme'

export type Rx = {
  sphRight: number | null; cylRight: number | null; axisRight: number | null
  sphLeft: number | null; cylLeft: number | null; axisLeft: number | null
  addPower: number | null
}

const fmt = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}`)

/** The customer's prescription as entered on the website — what the lab needs, straight from
 *  the order, so staff never depend on the WhatsApp alert reaching them. */
export function RxTable({ rx }: { rx: Rx }) {
  if ([rx.sphRight, rx.sphLeft, rx.cylRight, rx.cylLeft, rx.addPower].every((v) => v == null)) {
    return <Text style={styles.none}>No prescription entered yet.</Text>
  }
  const rows: [string, number | null, number | null, number | null][] = [
    ['Right (OD)', rx.sphRight, rx.cylRight, rx.axisRight],
    ['Left (OS)', rx.sphLeft, rx.cylLeft, rx.axisLeft],
  ]
  return (
    <View style={styles.table}>
      <View style={styles.row}>
        {['Eye', 'SPH', 'CYL', 'Axis'].map((h) => <Text key={h} style={[styles.cell, styles.head]}>{h}</Text>)}
      </View>
      {rows.map(([eye, sph, cyl, axis]) => (
        <View key={eye} style={styles.row}>
          <Text style={[styles.cell, styles.eye]}>{eye}</Text>
          <Text style={styles.cell}>{fmt(sph)}</Text>
          <Text style={styles.cell}>{fmt(cyl)}</Text>
          <Text style={styles.cell}>{axis == null ? '—' : `${axis}°`}</Text>
        </View>
      ))}
      {rx.addPower != null && Number(rx.addPower) > 0 && (
        <Text style={styles.add}>Add: {fmt(rx.addPower)}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, gap: 4 },
  row: { flexDirection: 'row' },
  cell: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.text },
  head: { fontFamily: font.semibold, fontSize: 12, color: colors.textMuted },
  eye: { fontFamily: font.semibold },
  add: { fontFamily: font.semibold, fontSize: 14, color: colors.text, marginTop: 2 },
  none: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
})
