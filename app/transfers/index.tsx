import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { FlatList, Text, View } from 'react-native'
import { api } from '../../src/lib/api'
import { useActiveStore } from '../../src/lib/activeStore'
import { TransferView } from '../../src/lib/pos'
import { colors, font, spacing } from '../../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Title } from '../../src/ui/components'

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  IN_TRANSIT: 'warning', COMPLETED: 'success', CANCELLED: 'neutral',
}

export default function Transfers() {
  const router = useRouter()
  const store = useActiveStore((s) => s.store)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['pos-transfers', store?.id],
    queryFn: async () => (await api.get<TransferView[]>('/admin/pos/transfers', { params: { storeId: store!.id } })).data,
    enabled: !!store,
  })

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />
  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      data={data}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.sm, gap: spacing.md }}>
          <Title>Transfers</Title>
          <Button label="+ New transfer" onPress={() => router.push('/transfers/new')} />
        </View>
      }
      ListEmptyComponent={<EmptyState icon="repeat" title="No transfers yet" />}
      renderItem={({ item }) => {
        const incoming = item.toStoreId === store.id
        return (
          <Card style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{item.reference}</Text>
              <Badge label={item.status} tone={STATUS_TONE[item.status] ?? 'neutral'} />
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted }}>
              {incoming ? 'Incoming' : 'Outgoing'} · {item.items.length} item(s)
            </Text>
            {incoming && item.status === 'IN_TRANSIT' && (
              <Button
                label="Mark received"
                onPress={async () => {
                  await api.post(`/admin/pos/transfers/${item.id}/receive`)
                  qc.invalidateQueries({ queryKey: ['pos-transfers', store.id] })
                }}
              />
            )}
            {!incoming && item.status === 'IN_TRANSIT' && (
              <Button
                label="Cancel"
                variant="danger"
                onPress={async () => {
                  await api.post(`/admin/pos/transfers/${item.id}/cancel`)
                  qc.invalidateQueries({ queryKey: ['pos-transfers', store.id] })
                }}
              />
            )}
          </Card>
        )
      }}
    />
  )
}
