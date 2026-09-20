import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { useLinkedRow } from '../src/lib/deepLink'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Title } from '../src/ui/components'

type DeliveryRow = {
  id: string
  orderNo: string
  status: string
  customerName: string | null
  customerPhone: string | null
  deliveryMethod: string | null
  pickupPoint: string | null
  shipAddress: string | null
  shipCity: string | null
  deliveryLat: number | null
  deliveryLng: number | null
  lensType: string | null
  hasPrescription: boolean
  cashOnDelivery: boolean
  totalMinor: number
  currency: string
  fulfilStoreName: string | null
  createdAt: string
  paidAt: string | null
}

// The four taps the packer actually makes. Each one names the NEXT step, so the button
// always reads as the thing you are about to do, not the state you are in.
const NEXT: Record<string, { target: string; label: string; icon: 'inbox' | 'package' | 'truck' | 'check' }> = {
  CONFIRMED: { target: 'ACCEPTED', label: 'Received by shop', icon: 'inbox' },
  PAID: { target: 'ACCEPTED', label: 'Received by shop', icon: 'inbox' },
  ACCEPTED: { target: 'PACKED', label: 'Mark packed', icon: 'package' },
  PACKED: { target: 'SHIPPED', label: 'Out for delivery', icon: 'truck' },
  SHIPPED: { target: 'DELIVERED', label: 'Mark delivered', icon: 'check' },
}

const LABEL: Record<string, string> = {
  CONFIRMED: 'Awaiting shop',
  PAID: 'Awaiting shop',
  ACCEPTED: 'At the shop',
  PACKED: 'Packed',
  SHIPPED: 'Out for delivery',
  DELIVERED: 'Delivered',
}

const TONE: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'accent'> = {
  CONFIRMED: 'warning',
  PAID: 'warning',
  ACCEPTED: 'info',
  PACKED: 'info',
  SHIPPED: 'accent',
  DELIVERED: 'success',
}

export default function Deliveries() {
  const qc = useQueryClient()
  const store = useActiveStore((s) => s.store)
  const [done, setDone] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', store?.id, done],
    queryFn: async () =>
      (await api.get<DeliveryRow[]>('/admin/deliveries', {
        params: { store_id: store?.id, done },
      })).data,
    refetchInterval: 30_000,
  })

  // Opened from a staff WhatsApp alert: ?id= names the order that alert was about.
  const { list, missing } = useLinkedRow(data)

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={list}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          <Title>Deliveries</Title>
          <View style={styles.toggle}>
            <Button label="To do" variant={done ? 'ghost' : 'primary'} onPress={() => setDone(false)} style={{ flex: 1 }} />
            <Button label="Delivered" variant={done ? 'primary' : 'ghost'} onPress={() => setDone(true)} style={{ flex: 1 }} />
          </View>
          {missing ? (
            <Text style={styles.meta}>
              The order from that alert is not in this list — try the other tab, or check it was
              routed to this shop.
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        done ? (
          <EmptyState icon="check" title="Nothing delivered yet" hint="Orders you complete will be listed here." />
        ) : (
          <EmptyState
            icon="truck"
            title="No web orders to fulfil"
            hint="Paid website orders routed to this shop show up here the moment they're placed."
          />
        )
      }
      renderItem={({ item }) => (
        <DeliveryCard row={item} onDone={() => qc.invalidateQueries({ queryKey: ['deliveries'] })} />
      )}
    />
  )
}

function DeliveryCard({ row, onDone }: { row: DeliveryRow; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const next = NEXT[row.status]
  const pickup = row.deliveryMethod === 'PICKUP'

  async function advance() {
    if (!next) return
    setBusy(true)
    setError(null)
    try {
      await api.patch(`/admin/deliveries/${row.id}/status`, { status: next.target, note: null })
      onDone()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  // Straight-line pin the customer gave at checkout; falls back to the typed address so the
  // driver always gets something openable.
  function openMap() {
    const q = row.deliveryLat != null && row.deliveryLng != null
      ? `${row.deliveryLat},${row.deliveryLng}`
      : [row.shipAddress, row.shipCity].filter(Boolean).join(', ')
    if (q) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`)
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.headRow}>
        <Text style={styles.orderNo}>{row.orderNo}</Text>
        <Badge label={LABEL[row.status] ?? row.status} tone={TONE[row.status] ?? 'neutral'} dot />
      </View>

      <Text style={styles.name}>{row.customerName ?? 'Guest'}</Text>
      {row.customerPhone ? <Text style={styles.meta}>{row.customerPhone}</Text> : null}
      <Text style={styles.meta}>
        {pickup ? `Collect at: ${row.pickupPoint ?? '—'}` : [row.shipAddress, row.shipCity].filter(Boolean).join(', ') || '—'}
      </Text>

      <View style={styles.flags}>
        <Badge label={formatKwacha(row.totalMinor)} tone="neutral" />
        {row.cashOnDelivery ? <Badge label="Collect cash" tone="warning" /> : <Badge label="Paid" tone="success" />}
        {pickup ? <Badge label="Pickup" tone="info" /> : null}
        {row.lensType ? <Badge label={`Lens: ${row.lensType}`} tone="info" /> : null}
        {row.lensType && !row.hasPrescription ? <Badge label="No prescription" tone="danger" /> : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {!pickup ? <Button label="Directions" icon="map-pin" variant="secondary" onPress={openMap} style={{ flex: 1 }} /> : null}
        {next ? (
          <Button label={next.label} icon={next.icon} onPress={advance} loading={busy} style={{ flex: 2 }} />
        ) : null}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  toggle: { flexDirection: 'row', gap: spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNo: { fontFamily: font.medium, fontSize: 13, color: colors.textMuted },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.text, marginTop: spacing.sm },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger, marginTop: spacing.sm },
})
