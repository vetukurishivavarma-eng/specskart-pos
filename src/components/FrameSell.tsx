import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { api, apiError } from '../lib/api'
import { useActiveStore } from '../lib/activeStore'
import { useAuth } from '../lib/auth'
import { enqueueSale, isNetworkError } from '../lib/offlineQueue'
import { CartLine, FrameProduct, PosSaleView } from '../lib/pos'
import { printSaleReceipt } from '../lib/receipt'
import { colors, font, formatKwacha, radius, spacing } from '../theme'
import { Badge, Button, Card, EmptyState, Field, ListRow, Loading, QtyStepper, Select, StatRow } from '../ui/components'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile' },
] as const

/** Frames are real per-store stock, unlike lenses — this rings up a sale against
 *  com.specskart.pos.SaleService, which checks and decrements it. */
export default function FrameSell() {
  const router = useRouter()
  const store = useActiveStore((s) => s.store)
  const user = useAuth((s) => s.user)
  const qc = useQueryClient()

  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [method, setMethod] = useState<string>('CASH')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSale, setLastSale] = useState<PosSaleView | null>(null)
  const [queuedOffline, setQueuedOffline] = useState(false)

  const { data: products, isLoading } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: async () => (await api.get('/admin/catalog/products')).data as
      { id: string; name: string; sku: string | null; barcode: string | null; priceMinor: number; currency: string; stockQty: number; status: string }[],
  })

  const results = useMemo(() => {
    const list = (products ?? []).filter((p) => p.status === 'ACTIVE')
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, 20)
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)
    ).slice(0, 20)
  }, [products, query])

  function addToCart(p: FrameProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id)
      if (existing) return prev.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      return [...prev, { product: p, quantity: 1 }]
    })
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) => (quantity <= 0
      ? prev.filter((l) => l.product.id !== productId)
      : prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l))))
  }

  const total = cart.reduce((sum, l) => sum + l.product.priceMinor * l.quantity, 0)

  async function checkout() {
    if (!store || cart.length === 0) return
    setBusy(true)
    setError(null)
    const body = {
      storeId: store.id,
      items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity, unitPriceMinor: null, discountMinor: null })),
      payments: [{ method, amountMinor: total, reference: null }],
      customerName: customerName.trim() || null,
      customerPhone: null,
      notes: '',
      clientReference: Crypto.randomUUID(),
    }
    try {
      const { data } = await api.post<PosSaleView>('/admin/pos/sales', body)
      setCart([])
      setCustomerName('')
      setLastSale(data)
      qc.invalidateQueries({ queryKey: ['pos-inventory', store.id] })
    } catch (e) {
      if (isNetworkError(e)) {
        // No signal right now -- queue it rather than lose the sale; it replays automatically
        // once connectivity returns (see src/lib/offlineQueue.ts). No receipt to print yet
        // since there's no server response.
        await enqueueSale('/admin/pos/sales', body, body.clientReference)
        setCart([])
        setCustomerName('')
        setQueuedOffline(true)
      } else {
        setError(apiError(e))
      }
    } finally {
      setBusy(false)
    }
  }

  if (!store) {
    return (
      <EmptyState icon="home" title="Pick a shop first" hint="Frame stock and sales are tracked per shop."
        action={<Button label="Choose a shop" onPress={() => router.push('/store-picker')} />} />
    )
  }

  if (lastSale || queuedOffline) {
    return (
      <Card style={{ marginTop: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
        <Badge label={queuedOffline ? 'Saved — will sync when back online' : 'Sale complete'} tone={queuedOffline ? 'warning' : 'success'} />
        {lastSale && (
          <>
            <Text style={{ fontFamily: font.extrabold, fontSize: 28, color: colors.text }}>{formatKwacha(lastSale.totalMinor)}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted }}>{lastSale.receiptNumber}</Text>
            <Button label="Print receipt" variant="secondary" onPress={() => printSaleReceipt(lastSale, store.name)} />
          </>
        )}
        <Button label="New sale" onPress={() => { setLastSale(null); setQueuedOffline(false) }} size="lg" />
      </Card>
    )
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 48, borderWidth: 1.5,
        borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.canvas,
      }}>
        <TextInput
          style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }}
          placeholder="Search by name, SKU, or scan a barcode"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <Card padded={false}>
          {results.map((p) => (
            <ListRow
              key={p.id}
              title={p.name}
              subtitle={`${p.sku ?? 'No SKU'} · ${formatKwacha(p.priceMinor)} · ${p.stockQty} in stock`}
              trailing={<Button label="Add" size="md" onPress={() => addToCart(p)} />}
            />
          ))}
          {results.length === 0 && <EmptyState icon="search" title="No matching products" />}
        </Card>
      )}

      {cart.length > 0 && (
        <Card style={{ gap: spacing.sm }}>
          {cart.map((line) => (
            <View key={line.product.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.text }} numberOfLines={1}>
                {line.product.name}
              </Text>
              <QtyStepper value={line.quantity} onChange={(q) => setQty(line.product.id, q)} size="sm" min={0} />
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text, width: 80, textAlign: 'right' }}>
                {formatKwacha(line.product.priceMinor * line.quantity)}
              </Text>
            </View>
          ))}
          <StatRow label="Total" value={formatKwacha(total)} emphasis />

          <Field label="Customer name (optional)" value={customerName} onChangeText={setCustomerName} />
          <Select label="Payment method" value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />

          {error && <Text style={{ color: colors.danger }}>{error}</Text>}
          <Button label={busy ? 'Billing…' : `Charge ${formatKwacha(total)}`} onPress={checkout} loading={busy} size="lg" />
        </Card>
      )}
    </View>
  )
}
