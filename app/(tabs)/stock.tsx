import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Text, TextInput, View } from 'react-native'
import { api } from '../../src/lib/api'
import { useActiveStore } from '../../src/lib/activeStore'
import { InventoryRow } from '../../src/lib/pos'
import { colors, font, formatKwacha, radius, spacing } from '../../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Title } from '../../src/ui/components'

export default function Stock() {
  const router = useRouter()
  const store = useActiveStore((s) => s.store)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['pos-inventory', store?.id],
    queryFn: async () => (await api.get<InventoryRow[]>(`/admin/pos/stores/${store!.id}/inventory`)).data,
    enabled: !!store,
  })

  if (!store) {
    return (
      <EmptyState icon="home" title="Pick a shop first" hint="Stock is tracked per shop."
        action={<Button label="Choose a shop" onPress={() => router.push('/store-picker')} />} />
    )
  }
  if (isLoading) return <Loading />

  const lowStock = (data ?? []).filter((r) => r.quantity <= r.reorderLevel).length

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={data}
      keyExtractor={(r) => r.productId}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Title>Stock — {store.name}</Title>
          {lowStock > 0 && <Badge label={`${lowStock} item(s) low or out of stock`} tone="warning" />}
        </View>
      }
      renderItem={({ item }) => (
        <Row
          row={item}
          storeId={store.id}
          onSaved={() => qc.invalidateQueries({ queryKey: ['pos-inventory', store.id] })}
        />
      )}
    />
  )
}

function Row({ row, storeId, onSaved }: { row: InventoryRow; storeId: string; onSaved: () => void }) {
  const [adjusting, setAdjusting] = useState(false)
  const [delta, setDelta] = useState('')
  const [busy, setBusy] = useState(false)
  const low = row.quantity <= row.reorderLevel

  async function apply() {
    const n = Number(delta)
    if (!Number.isFinite(n) || n === 0) return
    setBusy(true)
    try {
      await api.post(`/admin/pos/stores/${storeId}/inventory/${row.productId}/adjust`, { delta: n, note: 'Manual count' })
      setDelta('')
      setAdjusting(false)
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{row.productName}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.textMuted }}>
            {row.sku || 'No SKU'} · {formatKwacha(row.priceMinor)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: font.bold, fontSize: 18, color: low ? colors.danger : colors.text }}>{row.quantity}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 11, color: colors.textFaint }}>in stock</Text>
        </View>
      </View>

      {adjusting ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            style={{
              flex: 1, height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
              paddingHorizontal: spacing.md, backgroundColor: colors.canvas, fontFamily: font.medium, color: colors.text,
            }}
            placeholder="+5 or -2"
            keyboardType="numbers-and-punctuation"
            value={delta}
            onChangeText={setDelta}
            autoFocus
          />
          <Button label={busy ? '…' : 'Apply'} onPress={apply} disabled={busy} />
        </View>
      ) : (
        <Button label="Adjust stock" variant="secondary" onPress={() => setAdjusting(true)} />
      )}
    </Card>
  )
}
