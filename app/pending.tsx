import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { SaleView, money } from '../src/lib/lens'

const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE']

export default function Pending() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['lens-sales-pending'],
    queryFn: async () => (await api.get<SaleView[]>('/admin/lens-sales/pending')).data,
  })

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />
  if (!data?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No web orders waiting for pickup.</Text>
      </View>
    )
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => (
        <Card sale={item} onDone={() => qc.invalidateQueries({ queryKey: ['lens-sales-pending'] })} />
      )}
    />
  )
}

function Card({ sale, onDone }: { sale: SaleView; onDone: () => void }) {
  const user = useAuth((s) => s.user)
  const [method, setMethod] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete() {
    if (!method) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/lens-sales/${sale.id}/complete`, {
        paymentMethod: method,
        soldBy: user?.name ?? user?.email,
      })
      onDone()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{sale.customerName ?? 'Unnamed customer'}</Text>
      <Text style={styles.detail}>
        {sale.lensType}{sale.blueBlock ? ' + blue block' : ''}{sale.lensStructure ? ` + ${sale.lensStructure.toLowerCase()}` : ''}
      </Text>
      {sale.specialAxis && <Text style={styles.warn}>⚠ Special axis — check the Rx before handing over</Text>}
      <Text style={styles.price}>{money(sale.priceMinor, sale.currency)}</Text>

      <View style={styles.methods}>
        {PAYMENT_METHODS.map((m) => (
          <Pressable
            key={m}
            style={[styles.methodChip, method === m && styles.methodChipActive]}
            onPress={() => setMethod(m)}
          >
            <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.button, !method && styles.buttonDisabled]} onPress={complete} disabled={!method || busy}>
        <Text style={styles.buttonText}>{busy ? 'Completing…' : 'Mark as sold'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#666' },
  card: { backgroundColor: '#f4f4f4', borderRadius: 14, padding: 16, gap: 6 },
  name: { fontSize: 16, fontWeight: '700' },
  detail: { color: '#444' },
  warn: { color: '#a15c00', fontWeight: '600' },
  price: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  methods: { flexDirection: 'row', gap: 8, marginTop: 8 },
  methodChip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  methodChipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  methodText: { fontWeight: '600', color: '#333' },
  methodTextActive: { color: '#fff' },
  button: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c0392b' },
})
