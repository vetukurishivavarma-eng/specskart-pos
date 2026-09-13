import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { api, apiError } from '../../src/lib/api'
import { InvoiceView } from '../../src/lib/pos'
import { colors, font, formatKwacha, spacing } from '../../src/theme'
import { Badge, Button, Card, Field, ListRow, Loading, RowDivider, StatRow, Subtitle, Title } from '../../src/ui/components'

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['pos-invoice', id],
    queryFn: async () => (await api.get<InvoiceView>(`/admin/pos/invoices/${id}`)).data,
  })

  if (isLoading || !invoice) return <Loading />

  async function pay() {
    const minor = Math.round(Number(amount) * 100)
    if (!minor || minor <= 0) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/pos/invoices/${id}/payments`, { amountMinor: minor, method: 'CASH', reference: null, note: null })
      setAmount('')
      qc.invalidateQueries({ queryKey: ['pos-invoice', id] })
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View>
        <Title>{invoice.supplierName}</Title>
        <Subtitle>{invoice.invoiceNumber} · {invoice.invoiceDate}</Subtitle>
      </View>

      <Card style={{ gap: spacing.xs }}>
        <StatRow label="Subtotal" value={formatKwacha(invoice.subtotalMinor)} />
        <StatRow label="Other charges" value={formatKwacha(invoice.otherChargesMinor)} />
        <StatRow label="Total" value={formatKwacha(invoice.totalMinor)} emphasis />
        <StatRow label="Paid" value={formatKwacha(invoice.amountPaidMinor)} tone="success" />
        <StatRow label="Balance owed" value={formatKwacha(invoice.balanceMinor)} tone={invoice.balanceMinor > 0 ? 'danger' : 'default'} emphasis />
        <Badge label={invoice.status} tone={invoice.status === 'PAID' ? 'success' : invoice.status === 'PARTIAL' ? 'warning' : 'danger'} />
      </Card>

      <View>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text, marginBottom: spacing.sm }}>Items</Text>
        <Card padded={false}>
          {invoice.items.map((item, i) => (
            <View key={i}>
              <ListRow title={item.productName} subtitle={`${item.quantity} × ${formatKwacha(item.unitCostMinor)}`}
                trailing={<Text style={{ fontFamily: font.semibold, color: colors.text }}>{formatKwacha(item.lineTotalMinor)}</Text>} />
              {i < invoice.items.length - 1 && <RowDivider />}
            </View>
          ))}
        </Card>
      </View>

      {invoice.balanceMinor > 0 && (
        <Card style={{ gap: spacing.md }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>Record a payment</Text>
          <Field label="Amount (K)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          {error && <Text style={{ fontFamily: font.medium, color: colors.danger }}>{error}</Text>}
          <Button label={busy ? 'Recording…' : 'Record payment'} onPress={pay} disabled={!amount} loading={busy} />
        </Card>
      )}
    </ScrollView>
  )
}
