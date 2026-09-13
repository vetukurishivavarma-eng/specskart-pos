import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { PosSaleView } from '../src/lib/pos'
import { spacing } from '../src/theme'
import { Badge, EmptyState, ListRow, Loading, RowDivider, Select, Subtitle, Title } from '../src/ui/components'
import { formatKwacha } from '../src/theme'

const RANGES = [
  { value: '0', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
] as const

export default function Sales() {
  const store = useActiveStore((s) => s.store)
  const router = useRouter()
  const [days, setDays] = useState('0')

  const { data, isLoading } = useQuery({
    queryKey: ['pos-sales', store?.id, days],
    queryFn: async () => {
      const to = new Date().toISOString().slice(0, 10)
      const from = new Date(Date.now() - Number(days) * 86400_000).toISOString().slice(0, 10)
      return (await api.get<PosSaleView[]>('/admin/pos/sales', { params: { storeId: store!.id, from, to } })).data
    },
    enabled: !!store,
  })

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />
  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(s) => s.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <>
          <Title style={{ marginBottom: spacing.xs }}>Sales — {store.name}</Title>
          <Select value={days} options={RANGES as any} onChange={setDays} />
          <Subtitle style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>{data?.length ?? 0} sales</Subtitle>
        </>
      }
      ListEmptyComponent={<EmptyState icon="list" title="No sales in this range" />}
      renderItem={({ item }) => (
        <ListRow
          title={item.receiptNumber}
          subtitle={`${new Date(item.createdAt).toLocaleString()} · ${item.cashierName || 'Unknown'}`}
          trailing={<Badge label={formatKwacha(item.totalMinor)} tone={item.status === 'VOIDED' ? 'neutral' : item.totalMinor < 0 ? 'warning' : 'success'} />}
          onPress={() => router.push(`/transaction/${item.id}`)}
        />
      )}
    />
  )
}
