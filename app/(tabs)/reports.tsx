import { useQuery } from '@tanstack/react-query'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { api } from '../../src/lib/api'
import { useAuth } from '../../src/lib/auth'
import { SaleView } from '../../src/lib/lens'
import { colors, font, formatKwacha, spacing } from '../../src/theme'
import { Button, Card, EmptyState, ListRow, Loading, RowDivider, Subtitle, Title } from '../../src/ui/components'

export default function Reports() {
  const logout = useAuth((s) => s.logout)
  const today = new Date().toISOString().slice(0, 10)

  const summary = useQuery({
    queryKey: ['lens-sales-summary', today],
    queryFn: async () => (await api.get('/admin/lens-sales/summary', { params: { date: today } })).data,
  })
  const sales = useQuery({
    queryKey: ['lens-sales', today],
    queryFn: async () => (await api.get<SaleView[]>('/admin/lens-sales', { params: { date: today } })).data,
  })

  if (sales.isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={sales.data ?? []}
      keyExtractor={(s) => s.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          <Title>Today's sales</Title>
          <Card style={styles.summaryCard}>
            <Subtitle style={styles.summaryLabel}>Total</Subtitle>
            <Text style={styles.summaryValue}>
              {summary.data ? formatKwacha(summary.data.totalMinor) : '—'}
            </Text>
            <Subtitle>{summary.data?.count ?? 0} sale(s)</Subtitle>
          </Card>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="bar-chart-2" title="No sales yet today" />}
      renderItem={({ item }) => (
        <ListRow
          title={item.customerName ?? 'Unnamed customer'}
          subtitle={`${item.lensType}${item.blueBlock ? ' + blue block' : ''} · ${item.paymentMethod ?? '—'} · ${item.walkIn ? 'Walk-in' : 'Web order'}`}
          trailing={<Text style={styles.price}>{formatKwacha(item.priceMinor)}</Text>}
        />
      )}
      ListFooterComponent={
        <Button label="Sign out" variant="ghost" onPress={() => logout()} style={{ marginTop: spacing.xl }} />
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  summaryCard: { marginTop: spacing.md, gap: 2 },
  summaryLabel: { marginTop: 0 },
  summaryValue: { fontFamily: font.extrabold, fontSize: 32, color: colors.text },
  price: { fontFamily: font.bold, fontSize: 15, color: colors.text },
})
