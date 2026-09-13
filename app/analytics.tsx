import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, Text } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { ProductRank } from '../src/lib/pos'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { EmptyState, ListRow, Loading, RowDivider, Select, Title } from '../src/ui/components'

const METRICS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'profit', label: 'Profit' },
  { value: 'quantity', label: 'Quantity' },
] as const

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const

export default function Analytics() {
  const store = useActiveStore((s) => s.store)
  const [metric, setMetric] = useState('revenue')
  const [days, setDays] = useState('30')

  const { data, isLoading } = useQuery({
    queryKey: ['pos-top-products', store?.id, metric, days],
    queryFn: async () => {
      const to = new Date().toISOString().slice(0, 10)
      const from = new Date(Date.now() - Number(days) * 86400_000).toISOString().slice(0, 10)
      return (await api.get<ProductRank[]>('/admin/pos/analytics/top-products', {
        params: { storeId: store!.id, from, to, metric },
      })).data
    },
    enabled: !!store,
  })

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />
  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(r) => r.productId}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <>
          <Title style={{ marginBottom: spacing.sm }}>Top products — {store.name}</Title>
          <Select value={metric} options={METRICS as any} onChange={setMetric} />
          <Select value={days} options={RANGES as any} onChange={setDays} />
        </>
      }
      ListEmptyComponent={<EmptyState icon="bar-chart-2" title="No sales in this range" />}
      renderItem={({ item, index }) => (
        <ListRow
          title={`${index + 1}. ${item.productName}`}
          subtitle={`${item.quantity} sold`}
          trailing={
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: colors.text }}>
              {metric === 'quantity' ? item.quantity : formatKwacha(metric === 'profit' ? item.profitMinor : item.revenueMinor)}
            </Text>
          }
        />
      )}
    />
  )
}
