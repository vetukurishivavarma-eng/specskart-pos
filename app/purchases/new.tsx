import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { api, apiError } from '../../src/lib/api'
import { useActiveStore } from '../../src/lib/activeStore'
import { colors, font, formatKwacha, radius, spacing } from '../../src/theme'
import { Button, Card, EmptyState, Field, ListRow, Loading, Select, Title } from '../../src/ui/components'

type Product = { id: string; name: string; sku: string | null }
type Line = { product: Product; quantity: string; unitCostMinor: string }

export default function NewInvoice() {
  const router = useRouter()
  const store = useActiveStore((s) => s.store)

  const { data: suppliers } = useQuery({
    queryKey: ['pos-suppliers'],
    queryFn: async () => (await api.get('/admin/pos/suppliers')).data as { id: string; name: string }[],
  })
  const { data: products } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: async () => (await api.get('/admin/catalog/products')).data as Product[],
  })

  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [otherCharges, setOtherCharges] = useState('0')
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = products ?? []
    if (!q) return []
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)).slice(0, 10)
  }, [products, query])

  function addLine(p: Product) {
    setLines((prev) => (prev.some((l) => l.product.id === p.id) ? prev : [...prev, { product: p, quantity: '1', unitCostMinor: '0' }]))
    setQuery('')
  }

  const total = lines.reduce((sum, l) => sum + Math.round(Number(l.unitCostMinor) * 100) * (Number(l.quantity) || 0), 0)
    + Math.round(Number(otherCharges) * 100 || 0)

  const canSubmit = !!store && supplierId && invoiceNumber.trim() && lines.length > 0

  async function submit() {
    if (!canSubmit || !store) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/admin/pos/invoices', {
        supplierId,
        storeId: store.id,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: null,
        otherChargesMinor: Math.round(Number(otherCharges) * 100 || 0),
        notes: '',
        items: lines.map((l) => ({
          productId: l.product.id,
          productName: l.product.name,
          quantity: Number(l.quantity) || 0,
          unitCostMinor: Math.round(Number(l.unitCostMinor) * 100 || 0),
        })),
      })
      router.replace('/purchases')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  if (!store) return <EmptyState icon="home" title="Pick a shop first" hint="Deliveries are received into a specific shop." />

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Title>Record a delivery</Title>
      <Select label="Supplier" value={supplierId} options={[{ value: '', label: 'Pick a supplier' }, ...(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))]} onChange={setSupplierId} />
      <Field label="Invoice number" value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="As printed on the paper" />
      <Field label="Other charges (delivery, handling)" value={otherCharges} onChangeText={setOtherCharges} keyboardType="decimal-pad" />

      <View>
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs }}>Add items</Text>
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
        <Card key={line.product.id} style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{line.product.name}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Field label="Qty" value={line.quantity} onChangeText={(v) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, quantity: v } : l)))} keyboardType="number-pad" />
            <Field label="Unit cost (K)" value={line.unitCostMinor} onChangeText={(v) => setLines((prev) => prev.map((l, j) => (j === i ? { ...l, unitCostMinor: v } : l)))} keyboardType="decimal-pad" />
          </View>
        </Card>
      ))}

      {lines.length > 0 && (
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.text }}>Total: {formatKwacha(total)}</Text>
      )}

      {error && <Text style={{ fontFamily: font.medium, color: colors.danger }}>{error}</Text>}
      <Button label={busy ? 'Posting…' : 'Post invoice'} onPress={submit} disabled={!canSubmit} loading={busy} size="lg" />
    </ScrollView>
  )
}
