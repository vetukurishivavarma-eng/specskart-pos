import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { api, apiError } from '../../src/lib/api'
import { StoreView, useActiveStore } from '../../src/lib/activeStore'
import { colors, font, radius, spacing } from '../../src/theme'
import { Button, Card, EmptyState, Field, ListRow, Select, Title } from '../../src/ui/components'

type Product = { id: string; name: string; sku: string | null }
type Line = { product: Product; quantity: string }

export default function NewTransfer() {
  const router = useRouter()
  const store = useActiveStore((s) => s.store)

  const { data: stores } = useQuery({
    queryKey: ['pos-stores'],
    queryFn: async () => (await api.get('/admin/pos/stores')).data as StoreView[],
  })
  const { data: products } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: async () => (await api.get('/admin/catalog/products')).data as Product[],
  })

  const [toStoreId, setToStoreId] = useState('')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const otherStores = (stores ?? []).filter((s) => s.id !== store?.id && s.active)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = products ?? []
    if (!q) return []
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)).slice(0, 10)
  }, [products, query])

  function addLine(p: Product) {
    setLines((prev) => (prev.some((l) => l.product.id === p.id) ? prev : [...prev, { product: p, quantity: '1' }]))
    setQuery('')
  }

  const canSubmit = !!store && toStoreId && lines.length > 0

  async function submit() {
    if (!canSubmit || !store) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/admin/pos/transfers', {
        fromStoreId: store.id,
        toStoreId,
        notes,
        items: lines.map((l) => ({ productId: l.product.id, quantity: Number(l.quantity) || 0 })),
      })
      router.replace('/transfers')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Title>New transfer</Title>
      <Select label="Send to" value={toStoreId} options={[{ value: '', label: 'Pick a shop' }, ...otherStores.map((s) => ({ value: s.id, label: s.name }))]} onChange={setToStoreId} />
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} />

      <View>
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs }}>Add items from {store.name}'s stock</Text>
        <TextInput
          style={{
            height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
            paddingHorizontal: spacing.md, backgroundColor: colors.canvas, fontFamily: font.medium, color: colors.text,
          }}
          placeholder="Search products"
          value={query}
          onChangeText={setQuery}
        />
        {results.map((p) => (
          <ListRow key={p.id} title={p.name} subtitle={p.sku ?? 'No SKU'} onPress={() => addLine(p)} />
        ))}
      </View>

      {lines.map((line, i) => (
        <Card key={line.product.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.text }}>{line.product.name}</Text>
          <View style={{ width: 80 }}>
            <Field label="Qty" value={line.quantity} onChangeText={(v) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, quantity: v } : l)))} keyboardType="number-pad" />
          </View>
        </Card>
      ))}

      {error && <Text style={{ fontFamily: font.medium, color: colors.danger }}>{error}</Text>}
      <Button label={busy ? 'Sending…' : 'Send transfer'} onPress={submit} disabled={!canSubmit} loading={busy} size="lg" />
    </ScrollView>
  )
}
