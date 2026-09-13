import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, Text, TextInput, View } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { InventoryRow } from '../src/lib/pos'
import { colors, font, formatKwacha, radius, spacing } from '../src/theme'
import { Button, Card, EmptyState, Loading, Title } from '../src/ui/components'

export default function StorePricing() {
  const store = useActiveStore((s) => s.store)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['pos-inventory', store?.id],
    queryFn: async () => (await api.get<InventoryRow[]>(`/admin/pos/stores/${store!.id}/inventory`)).data,
    enabled: !!store,
  })

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />
  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(r) => r.productId}
      ListHeaderComponent={<Title style={{ marginBottom: spacing.md }}>Pricing — {store.name}</Title>}
      renderItem={({ item }) => (
        <Row row={item} storeId={store.id} onSaved={() => qc.invalidateQueries({ queryKey: ['pos-inventory', store.id] })} />
      )}
    />
  )
}

function Row({ row, storeId, onSaved }: { row: InventoryRow; storeId: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState((row.priceMinor / 100).toFixed(2))
  const [busy, setBusy] = useState(false)

  async function save() {
    const minor = Math.round(Number(price) * 100)
    if (Number.isNaN(minor) || minor < 0) return
    setBusy(true)
    try {
      await api.put(`/admin/pos/stores/${storeId}/prices/${row.productId}`, { priceMinor: minor })
      setEditing(false)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setBusy(true)
    try {
      await api.delete(`/admin/pos/stores/${storeId}/prices/${row.productId}`)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text, flex: 1 }} numberOfLines={1}>
          {row.productName}
        </Text>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.text }}>{formatKwacha(row.priceMinor)}</Text>
      </View>
      {editing ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            style={{
              flex: 1, height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
              paddingHorizontal: spacing.md, backgroundColor: colors.canvas, fontFamily: font.medium, color: colors.text,
            }}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <Button label={busy ? '…' : 'Save'} onPress={save} disabled={busy} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label="Override price here" variant="secondary" onPress={() => setEditing(true)} />
          <Button label="Reset to default" variant="ghost" onPress={reset} disabled={busy} />
        </View>
      )}
    </Card>
  )
}
