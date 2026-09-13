import { useQuery } from '@tanstack/react-query'
import { FlatList, Text, View } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { ReorderLine } from '../src/lib/pos'
import { colors, font, spacing } from '../src/theme'
import { Badge, EmptyState, ListRow, Loading, RowDivider, Title } from '../src/ui/components'

export default function Reorder() {
  const store = useActiveStore((s) => s.store)
  const { data, isLoading } = useQuery({
    queryKey: ['pos-reorder', store?.id],
    queryFn: async () => (await api.get<ReorderLine[]>('/admin/pos/reorder', { params: { storeId: store!.id } })).data,
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
      ListHeaderComponent={<Title style={{ marginBottom: spacing.md }}>Reorder — {store.name}</Title>}
      ListEmptyComponent={<EmptyState icon="check-circle" title="Nothing needs reordering" />}
      renderItem={({ item }) => (
        <ListRow
          icon="alert-triangle"
          title={item.productName}
          subtitle={`${item.sku} · ${item.quantity} left, reorder below ${item.reorderLevel}`}
          trailing={
            <View style={{ alignItems: 'flex-end' }}>
              <Badge label={`Suggest ${item.suggestedQuantity}`} tone="warning" />
            </View>
          }
        />
      )}
    />
  )
}
