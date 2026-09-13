import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { PosSaleView } from '../src/lib/pos'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { Button, Card, Field, Loading, QtyStepper, Select, Title } from '../src/ui/components'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile' },
] as const

export default function Refund() {
  const { saleId } = useLocalSearchParams<{ saleId: string }>()
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [method, setMethod] = useState('CASH')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: sale, isLoading } = useQuery({
    queryKey: ['pos-sale', saleId],
    queryFn: async () => (await api.get<PosSaleView>(`/admin/pos/sales/${saleId}`)).data,
  })

  if (isLoading || !sale) return <Loading />

  const total = sale.items.reduce((sum, item) => {
    const qty = quantities[item.productId] ?? 0
    return sum + qty * item.unitPriceMinor
  }, 0)

  async function submit() {
    const items = sale!.items
      .filter((i) => (quantities[i.productId] ?? 0) > 0)
      .map((i) => ({ productId: i.productId, quantity: quantities[i.productId], unitPriceMinor: null, discountMinor: null }))
    if (items.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/pos/sales/${saleId}/refund`, { items, method, reason })
      router.replace(`/transaction/${saleId}`)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Title>Refund {sale.receiptNumber}</Title>

      <Card style={{ gap: spacing.sm }}>
        {sale.items.map((item) => (
          <View key={item.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.text }} numberOfLines={1}>
              {item.productName} (sold {item.quantity})
            </Text>
            <QtyStepper
              value={quantities[item.productId] ?? 0}
              onChange={(q) => setQuantities((prev) => ({ ...prev, [item.productId]: q }))}
              min={0}
              max={item.quantity}
              size="sm"
            />
          </View>
        ))}
      </Card>

      <Select label="Refund method" value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />
      <Field label="Reason (optional)" value={reason} onChangeText={setReason} />

      <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.text }}>Refunding {formatKwacha(total)}</Text>
      {error && <Text style={{ fontFamily: font.medium, color: colors.danger }}>{error}</Text>}
      <Button label={busy ? 'Refunding…' : 'Confirm refund'} variant="danger" onPress={submit} disabled={total === 0} loading={busy} size="lg" />
    </ScrollView>
  )
}
