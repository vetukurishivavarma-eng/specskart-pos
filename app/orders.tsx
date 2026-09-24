import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { useLinkedRow } from '../src/lib/deepLink'
import { SaleView } from '../src/lib/lens'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Select, Title } from '../src/ui/components'

// Collection ladder, in order. Staff move an order one rung at a time; the last rung also
// bills it and takes the pair off this shop's shelf, so that's the only step that needs a
// payment method. DELIVERED means collected — the stored name predates shop pickup.
const LADDER = ['ORDERED', 'READY', 'DELIVERED'] as const
const STAGE_LABEL: Record<string, string> = {
  ORDERED: 'Being made',
  READY: 'Ready for pickup',
  DELIVERED: 'Collected',
}
const NEXT_ACTION: Record<string, string> = {
  ORDERED: 'Mark ready for pickup',
  READY: 'Mark collected',
}

const PAYMENT_METHODS = [
  { value: '', label: 'Pick payment' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile' },
] as const

export default function Orders() {
  const qc = useQueryClient()
  // Handing an order over used to make it vanish with nowhere to look it up: this screen is
  // "not collected yet", and Reports filters on a different field for a single day.
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
          label="Collected"
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
            title="Nothing collected yet"
            hint="Orders you hand over will be listed here."
          />
        ) : (
          <EmptyState
            icon="inbox"
            title={linkedId ? 'That order is not waiting here' : 'No web orders waiting'}
            hint={
              linkedId
                ? 'It may already have been collected — check the Collected tab.'
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
  const handover = next === 'DELIVERED' && !sale.paid // the rung that also bills it, unless already paid online

  async function advance() {
    if (handover && !method) return
    setBusy(true)
    setError(null)
    try {
      await api.post(`/admin/lens-sales/${sale.id}/fulfilment`, {
        stage: next,
        paymentMethod: handover ? method : undefined,
        soldBy: user?.name ?? user?.email,
      })
      onDone()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  // A web order that won't go ahead. Nothing was taken off the shelf unless it was already
  // collected, and a collected order can't be cancelled, so there is nothing to put back.
  function cancel() {
    Alert.alert('Cancel this order?', sale.paid
      ? 'The customer is told on WhatsApp. They paid online: refund them from the Flutterwave dashboard.'
      : 'The customer is told on WhatsApp.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel order', style: 'destructive', onPress: async () => {
          setBusy(true)
          setError(null)
          try {
            await api.post(`/admin/lens-sales/${sale.id}/cancel`)
            onDone()
          } catch (e) {
            setError(apiError(e))
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  return (
    <Card style={{ marginBottom: spacing.md, gap: spacing.sm }}>
      <Text style={styles.name}>{sale.customerName ?? 'Unnamed customer'}</Text>
      <View style={styles.badges}>
        <Badge label={STAGE_LABEL[stage] ?? stage} tone={stage === 'READY' ? 'warning' : 'neutral'} />
        {sale.paid && <Badge label="Paid online" tone="success" />}
      </View>
      <Text style={styles.detail}>
        {sale.lensType}{sale.blueBlock ? ' + blue block' : ''}{sale.lensStructure ? ` + ${sale.lensStructure.toLowerCase()}` : ''}
      </Text>
      {sale.specialAxis && <Badge label="Special axis — check before handing over" tone="warning" />}
      <Text style={styles.price}>{formatKwacha(sale.priceMinor)}</Text>

      {stage === 'READY' ? (
        <Text style={styles.hint}>Waiting for the customer (or whoever they send) to collect.</Text>
      ) : null}

      {handover && <Select value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {next && (
        <Button
          label={busy ? 'Saving…' : NEXT_ACTION[stage]}
          onPress={advance}
          disabled={handover && !method}
          loading={busy}
        />
      )}
      {handover && !method && <Text style={styles.hint}>Pick how they paid to close the order.</Text>}
      {next && <Button label="Cancel order" variant="ghost" onPress={cancel} disabled={busy} />}
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
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted },
})
