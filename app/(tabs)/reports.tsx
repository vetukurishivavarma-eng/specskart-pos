import { useQuery } from '@tanstack/react-query'
import { FlatList, Text, View } from 'react-native'
import { api } from '../../src/lib/api'
import { useActiveStore } from '../../src/lib/activeStore'
import { SaleView as LensSaleView } from '../../src/lib/lens'
import { PosSaleView } from '../../src/lib/pos'
import { colors, font, formatKwacha, spacing } from '../../src/theme'
import { Card, EmptyState, ListRow, Loading, RowDivider, Subtitle, Title } from '../../src/ui/components'

type Row = { id: string; title: string; subtitle: string; amountMinor: number; createdAt: string }

export default function Reports() {
  const store = useActiveStore((s) => s.store)
  const today = new Date().toISOString().slice(0, 10)

  const lensSummary = useQuery({
    queryKey: ['lens-sales-summary', today],
    queryFn: async () => (await api.get('/admin/lens-sales/summary', { params: { date: today } })).data,
  })
  const lensSales = useQuery({
    queryKey: ['lens-sales', today],
    queryFn: async () => (await api.get<LensSaleView[]>('/admin/lens-sales', { params: { date: today } })).data,
  })
  const frameSales = useQuery({
    queryKey: ['pos-sales', store?.id, today],
    queryFn: async () => (await api.get<PosSaleView[]>('/admin/pos/sales', { params: { storeId: store!.id, date: today } })).data,
    enabled: !!store,
  })

  if (lensSales.isLoading) return <Loading />

  const lensRows: Row[] = (lensSales.data ?? []).map((s) => ({
    id: `lens-${s.id}`,
    title: s.customerName ?? 'Unnamed customer',
    subtitle: `${s.lensType}${s.blueBlock ? ' + blue block' : ''} · ${s.paymentMethod ?? '—'} · ${s.walkIn ? 'Walk-in' : 'Web order'}`,
    amountMinor: s.priceMinor,
    createdAt: s.createdAt,
  }))
  const frameRows: Row[] = (frameSales.data ?? []).filter((s) => s.status !== 'VOIDED').map((s) => ({
    id: `frame-${s.id}`,
    title: s.customerName ?? 'Unnamed customer',
    subtitle: `${s.items.length} item(s) · ${s.receiptNumber}`,
    amountMinor: s.totalMinor,
    createdAt: s.createdAt,
  }))
  const rows = [...lensRows, ...frameRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const grandTotal = (lensSummary.data?.totalMinor ?? 0) + frameRows.reduce((sum, r) => sum + r.amountMinor, 0)

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={rows}
      keyExtractor={(r) => r.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Title>Today's sales</Title>
          <Card style={{ marginTop: spacing.md, gap: 2 }}>
            <Subtitle style={{ marginTop: 0 }}>Total (lens + frames)</Subtitle>
            <Text style={{ fontFamily: font.extrabold, fontSize: 32, color: colors.text }}>{formatKwacha(grandTotal)}</Text>
            <Subtitle>{rows.length} sale(s){!store ? ' · pick a shop to include frame sales' : ''}</Subtitle>
          </Card>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="bar-chart-2" title="No sales yet today" />}
      renderItem={({ item }) => (
        <ListRow
          title={item.title}
          subtitle={item.subtitle}
          trailing={<Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.text }}>{formatKwacha(item.amountMinor)}</Text>}
        />
      )}
    />
  )
}
