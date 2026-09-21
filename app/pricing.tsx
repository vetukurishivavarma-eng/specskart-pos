import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from '../src/lib/api'
import { PricingOption } from '../src/lib/lens'
import { colors, font, formatKwacha, radius, spacing } from '../src/theme'
import { Button, Card, Loading, RowDivider, Title } from '../src/ui/components'

export default function Pricing() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['lens-pricing'],
    queryFn: async () => (await api.get<PricingOption[]>('/admin/lens-pricing')).data,
  })

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Title>Lens pricing</Title>
          {/* the old on/off stock switch was never enforced; blanks are counted per shop now */}
          <Text style={styles.current}>Lens stock is counted per shop on the Stock tab (Lens blank items).</Text>
        </View>
      }
      ItemSeparatorComponent={RowDivider}
      renderItem={({ item }) => (
        <Row option={item} onSaved={() => qc.invalidateQueries({ queryKey: ['lens-pricing'] })} />
      )}
    />
  )
}

function Row({ option, onSaved }: { option: PricingOption; onSaved: () => void }) {
  const [price, setPrice] = useState((option.priceMinor / 100).toFixed(2))
  const [saving, setSaving] = useState(false)
  const dirty = Math.round(Number(price) * 100) !== option.priceMinor

  async function save() {
    const minor = Math.round(Number(price) * 100)
    if (Number.isNaN(minor) || minor < 0) return
    setSaving(true)
    try {
      await api.patch(`/admin/lens-pricing/${option.id}`, { priceMinor: minor })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card style={{ marginBottom: spacing.md, gap: spacing.md }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{option.label}</Text>
          <Text style={styles.current}>Current: {formatKwacha(option.priceMinor)}</Text>
        </View>
      </View>
      <View style={styles.priceRow}>
        <View style={styles.input}>
          <Text style={styles.prefix}>K</Text>
          <TextInput style={styles.inputField} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>
        {dirty && <Button label={saving ? '…' : 'Save'} onPress={save} disabled={saving} />}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
  current: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, height: 48,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.canvas,
  },
  prefix: { fontFamily: font.semibold, fontSize: 15, color: colors.textMuted },
  inputField: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text },
})
