import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { FlatList, View } from 'react-native'
import { api } from '../../src/lib/api'
import { InvoiceView } from '../../src/lib/pos'
import { formatKwacha, spacing } from '../../src/theme'
import { Badge, Button, EmptyState, ListRow, Loading, RowDivider, Title } from '../../src/ui/components'

export default function Purchases() {
  const router = useRouter()
  const { data, isLoading } = useQuery({
    queryKey: ['pos-invoices-unpaid'],
    queryFn: async () => (await api.get<InvoiceView[]>('/admin/pos/invoices', { params: { unpaidOnly: true } })).data,
  })

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(i) => i.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md, gap: spacing.md }}>
          <Title>Supplier invoices</Title>
          <Button label="+ Record a delivery" onPress={() => router.push('/purchases/new')} />
        </View>
      }
      ListEmptyComponent={<EmptyState icon="file-text" title="Nothing owed to suppliers" hint="Every posted invoice is fully paid." />}
      renderItem={({ item }) => (
        <ListRow
          icon="file-text"
          title={`${item.supplierName} — ${item.invoiceNumber}`}
          subtitle={`${formatKwacha(item.totalMinor)} total`}
          trailing={<Badge label={`${formatKwacha(item.balanceMinor)} owed`} tone={item.status === 'PARTIAL' ? 'warning' : 'danger'} />}
          onPress={() => router.push(`/purchases/${item.id}`)}
        />
      )}
    />
  )
}
