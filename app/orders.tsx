import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { useLinkedRow } from '../src/lib/deepLink'
import { SaleView } from '../src/lib/lens'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Select, Title } from '../src/ui/components'

// Doorstep ladder, in order. Staff move an order one rung at a time; the last rung also
// bills it, so that's the only step that needs a payment method.
const LADDER = ['ORDERED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const
const STAGE_LABEL: Record<string, string> = {
  ORDERED: 'Ordered',
  PACKED: 'Packed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
}
const NEXT_ACTION: Record<string, string> = {
  ORDERED: 'Mark packed',
  PACKED: 'Send out for delivery',
  OUT_FOR_DELIVERY: 'Mark delivered',
}

const PAYMENT_METHODS = [
  { value: '', label: 'Pick payment' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile' },
] as const

export default function Orders() {
  const qc = useQueryClient()
  // Delivering an order used to make it vanish with nowhere to look it up: this screen is
  // "not delivered yet", and Reports filters on a different field for a single day.
  const [done, setDone] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['lens-sales-pending', done],
    queryFn: async () =>
      (await api.get<SaleView[]>('/admin/lens-sales/pending', { params: { delivered: done } })).data,
    refetchInterval: 30_000,
  })

  // Opened from a staff WhatsApp alert: ?id= names the order that alert was about.
  const { list, linkedId, missing } = useLinkedRow(data)

  if (isLoading) return <Loading />

  const header = (
    <View style={{ marginBottom: spacing.md, gap: spacing.md }}>
      <Title>Web orders</Title>
      <View style={styles.tabs}>
        <Button
          label="To do"
          variant={done ? 'ghost' : 'primary'}
          onPress={() => setDone(false)}
          style={{ flex: 1 }}
        />
        <Button
          label="Delivered"
          variant={done ? 'primary' : 'ghost'}
          onPress={() => setDone(true)}
          style={{ flex: 1 }}
        />
      </View>
      {missing ? (
        <Text style={styles.hint}>
          The order from that alert is not in this list — try the other tab.
        </Text>
      ) : null}
    </View>
  )

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={list}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        done ? (
          <EmptyState
            icon="check"
            title="Nothing delivered yet"
            hint="Orders you hand over will be listed here."
          />
        ) : (
          <EmptyState
            icon="inbox"
            title={linkedId ? 'That order is not waiting here' : 'No web orders waiting'}
            hint={
              linkedId
                ? 'It may already have been delivered — check the Delivered tab.'
                : 'Orders verified over WhatsApp will show up here for pickup.'
            }
          />
        )
      }
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

  const stage = sale.fulfilment ?? 'ORDERED'
  const next = LADDER[LADDER.indexOf(stage as any) + 1]
  const delivering = next === 'DELIVERED' && !sale.paid // the rung that also bills it, unless already paid online

  async function advance() {
    if (delivering && !method) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/lens-sales/${sale.id}/fulfilment`, {
        stage: next,
        paymentMethod: delivering ? method : undefined,
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
    <Card style={{ marginBottom: spacing.md, gap: spacing.sm }}>
      <Text style={styles.name}>{sale.customerName ?? 'Unnamed customer'}</Text>
      <View style={styles.badges}>
        <Badge label={STAGE_LABEL[stage] ?? stage} tone={stage === 'OUT_FOR_DELIVERY' ? 'warning' : 'neutral'} />
        {sale.paid && <Badge label="Paid online" tone="success" />}
      </View>
      <Text style={styles.detail}>
        {sale.lensType}{sale.blueBlock ? ' + blue block' : ''}{sale.lensStructure ? ` + ${sale.lensStructure.toLowerCase()}` : ''}
      </Text>
      {sale.specialAxis && <Badge label="Special axis — check before handing over" tone="warning" />}
      <Text style={styles.price}>{formatKwacha(sale.priceMinor)}</Text>

      {sale.deliveryAddress ? (
        <View style={styles.deliver}>
          <Text style={styles.deliverLabel}>Deliver to</Text>
          <Text style={styles.detail}>{sale.deliveryName ?? sale.customerName ?? '—'}</Text>
          <Text style={styles.detail}>{sale.deliveryAddress}{sale.deliveryArea ? `, ${sale.deliveryArea}` : ''}</Text>
          {sale.deliveryLandmark ? <Text style={styles.detail}>Landmark: {sale.deliveryLandmark}</Text> : null}
        </View>
      ) : null}

      {delivering && <Select value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {next && (
        <Button
          label={busy ? 'Saving…' : NEXT_ACTION[stage]}
          onPress={advance}
          disabled={delivering && !method}
          loading={busy}
        />
      )}
      {delivering && !method && <Text style={styles.hint}>Pick how they paid to close the order.</Text>}
    </Card>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  detail: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  price: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
  deliver: { gap: 2, borderLeftWidth: 3, borderLeftColor: colors.borderStrong, paddingLeft: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted },
  deliverLabel: { fontFamily: font.medium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: colors.textMuted },
})
