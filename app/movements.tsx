import { useQuery } from '@tanstack/react-query'
import { FlatList, Text, View } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { MovementView } from '../src/lib/pos'
import { colors, font, spacing } from '../src/theme'
import { Badge, EmptyState, ListRow, Loading, RowDivider, Title } from '../src/ui/components'

const TONE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  PURCHASE: 'success', SALE: 'danger', REFUND: 'info', TRANSFER_IN: 'success',
  TRANSFER_OUT: 'danger', ADJUSTMENT: 'warning',
}

export default function Movements() {
  const store = useActiveStore((s) => s.store)
  const { data, isLoading } = useQuery({
    queryKey: ['pos-movements', store?.id],
    queryFn: async () => (await api.get<MovementView[]>(`/admin/pos/stores/${store!.id}/movements`)).data,
    enabled: !!store,
  })

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />
  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(m, i) => `${m.productId}-${m.createdAt}-${i}`}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={<Title style={{ marginBottom: spacing.md }}>Stock movements — {store.name}</Title>}
      ListEmptyComponent={<EmptyState icon="list" title="No stock movements yet" />}
      renderItem={({ item }) => (
        <ListRow
          title={item.productName}
          subtitle={`${new Date(item.createdAt).toLocaleString()}${item.note ? ` · ${item.note}` : ''}`}
          trailing={
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Badge label={item.type} tone={TONE[item.type] ?? 'neutral'} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>
                {item.quantity > 0 ? '+' : ''}{item.quantity} → {item.balance}
              </Text>
            </View>
          }
        />
      )}
    />
  )
}
