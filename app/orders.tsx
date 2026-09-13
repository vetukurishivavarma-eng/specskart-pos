import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { SaleView } from '../src/lib/lens'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Select, Title } from '../src/ui/components'

const PAYMENT_METHODS = [
  { value: '', label: 'Pick payment' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile' },
] as const

export default function Orders() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['lens-sales-pending'],
    queryFn: async () => (await api.get<SaleView[]>('/admin/lens-sales/pending')).data,
    refetchInterval: 30_000,
  })

  if (isLoading) return <Loading />
  if (!data?.length) {
    return <EmptyState icon="inbox" title="No web orders waiting" hint="Orders verified over WhatsApp will show up here for pickup." />
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={<Title style={{ marginBottom: spacing.md }}>Web orders</Title>}
      renderItem={({ item }) => (
        <SaleCard sale={item} onDone={() => qc.invalidateQueries({ queryKey: ['lens-sales-pending'] })} />
      )}
    />
  )
}

function SaleCard({ sale, onDone }: { sale: SaleView; onDone: () => void }) {
  const user = useAuth((s) => s.user)
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function complete() {
    if (!method) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/lens-sales/${sale.id}/complete`, { paymentMethod: method, soldBy: user?.name ?? user?.email })
      onDone()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={{ marginBottom: spacing.md, gap: spacing.sm }}>
      <Text style={styles.name}>{sale.customerName ?? 'Unnamed customer'}</Text>
      <Text style={styles.detail}>
        {sale.lensType}{sale.blueBlock ? ' + blue block' : ''}{sale.lensStructure ? ` + ${sale.lensStructure.toLowerCase()}` : ''}
      </Text>
      {sale.specialAxis && <Badge label="Special axis — check before handing over" tone="warning" />}
      <Text style={styles.price}>{formatKwacha(sale.priceMinor)}</Text>

      <Select value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button label={busy ? 'Completing…' : 'Mark as sold'} onPress={complete} disabled={!method} loading={busy} />
    </Card>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  detail: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  price: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
})
