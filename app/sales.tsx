import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { api } from '../src/lib/api'
import { SaleView, money } from '../src/lib/lens'

export default function Sales() {
  const today = new Date().toISOString().slice(0, 10)
  const { data, isLoading } = useQuery({
    queryKey: ['lens-sales', today],
    queryFn: async () => (await api.get<SaleView[]>('/admin/lens-sales', { params: { date: today } })).data,
  })

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />
  if (!data?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No sales yet today.</Text>
      </View>
    )
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.customerName ?? 'Unnamed customer'}</Text>
            <Text style={styles.detail}>
              {item.lensType}{item.blueBlock ? ' + blue block' : ''} · {item.paymentMethod ?? '—'}
              {item.walkIn ? ' · Walk-in' : ' · Web order'}
            </Text>
            <Text style={styles.sold}>Sold by {item.soldBy ?? '—'}</Text>
          </View>
          <Text style={styles.price}>{money(item.priceMinor, item.currency)}</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f4', borderRadius: 12, padding: 14 },
  name: { fontWeight: '700' },
  detail: { color: '#555', marginTop: 2, fontSize: 13 },
  sold: { color: '#888', marginTop: 2, fontSize: 12 },
  price: { fontWeight: '700', fontSize: 16 },
})
