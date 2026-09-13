import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { api } from '../../src/lib/api'
import { useActiveStore } from '../../src/lib/activeStore'
import { PosSaleView } from '../../src/lib/pos'
import { printSaleReceipt } from '../../src/lib/receipt'
import { colors, font, formatKwacha, spacing } from '../../src/theme'
import { Badge, Button, Card, ListRow, Loading, RowDivider, StatRow, Subtitle, Title } from '../../src/ui/components'

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const store = useActiveStore((s) => s.store)

  const { data: sale, isLoading } = useQuery({
    queryKey: ['pos-sale', id],
    queryFn: async () => (await api.get<PosSaleView>(`/admin/pos/sales/${id}`)).data,
  })

  if (isLoading || !sale) return <Loading />

  const isRefund = sale.totalMinor < 0

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View>
        <Title>{sale.receiptNumber}</Title>
        <Subtitle>{new Date(sale.createdAt).toLocaleString()} · {sale.cashierName || 'Unknown cashier'}</Subtitle>
      </View>

      <Badge label={sale.status} tone={sale.status === 'VOIDED' ? 'neutral' : isRefund ? 'warning' : 'success'} />

      <Card padded={false}>
        {sale.items.map((item, i) => (
          <View key={i}>
            <ListRow title={item.productName} subtitle={`${item.quantity} × ${formatKwacha(item.unitPriceMinor)}`}
              trailing={<Text style={{ fontFamily: font.semibold, color: colors.text }}>{formatKwacha(item.lineTotalMinor)}</Text>} />
            {i < sale.items.length - 1 && <RowDivider />}
          </View>
        ))}
      </Card>

      <Card style={{ gap: spacing.xs }}>
        <StatRow label="Total" value={formatKwacha(sale.totalMinor)} emphasis />
        {sale.payments.map((p, i) => (
          <StatRow key={i} label={p.method} value={formatKwacha(p.amountMinor)} />
        ))}
      </Card>

      <Button label="Print receipt" variant="secondary" onPress={() => printSaleReceipt(sale, store?.name ?? '')} />
      {sale.status === 'COMPLETED' && !isRefund && (
        <Button label="Refund" variant="danger" onPress={() => router.push(`/refund?saleId=${sale.id}`)} />
      )}
    </ScrollView>
  )
}
