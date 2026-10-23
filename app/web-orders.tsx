import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Alert, FlatList, Linking, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { useLinkedRow } from '../src/lib/deepLink'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Title } from '../src/ui/components'

// Mirrors com.specskart.order.OrderDtos.DeliveryRow.
type WebOrder = {
  id: string
  orderNo: string
  status: string
  customerName: string | null
  customerPhone: string | null
  cashOnDelivery: boolean
  totalMinor: number
  fulfilStoreName: string | null
  createdAt: string
  paidAt: string | null
  items: string[]
  leadId: string | null
}

// Frames ordered on the website, collected and paid for at the shop -- the same three steps as a
// lens order: call the customer to check they really want it, ready for pickup, collected.
// Each step WhatsApps the customer (CheckoutService.updateStatus).
const STAGE_LABEL: Record<string, string> = {
  CONFIRMED: 'New — call the customer',
  PAID: 'New — call the customer',
  ACCEPTED: 'Confirmed — get it ready',
  PACKED: 'Ready for pickup',
  SHIPPED: 'Ready for pickup',
  DELIVERED: 'Collected',
}
const NEXT: Record<string, { status: string; label: string }> = {
  CONFIRMED: { status: 'ACCEPTED', label: 'Customer confirmed' },
  PAID: { status: 'ACCEPTED', label: 'Customer confirmed' },
  ACCEPTED: { status: 'PACKED', label: 'Mark ready for pickup' },
  PACKED: { status: 'DELIVERED', label: 'Mark collected' },
  SHIPPED: { status: 'DELIVERED', label: 'Mark collected' },
}

export default function WebOrders() {
  const qc = useQueryClient()
  const [done, setDone] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['web-orders', done],
    // a shop login gets its own shop's orders; an admin sees every shop
    queryFn: async () => (await api.get<WebOrder[]>('/admin/deliveries', { params: { done } })).data,
    refetchInterval: 30_000,
  })

  // Opened from a staff alert: ?id= names the order that alert was about.
  const { list, linkedId, missing } = useLinkedRow(data)

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={list}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md, gap: spacing.md }}>
          <Title>Frame orders</Title>
          <View style={styles.row}>
            <Button label="To do" variant={done ? 'ghost' : 'primary'} onPress={() => setDone(false)} style={{ flex: 1 }} />
            <Button label="Collected" variant={done ? 'primary' : 'ghost'} onPress={() => setDone(true)} style={{ flex: 1 }} />
          </View>
          {missing ? <Text style={styles.hint}>The order from that alert is not in this list — try the other tab.</Text> : null}
        </View>
      }
      ListEmptyComponent={done
        ? <EmptyState icon="check" title="Nothing collected yet" hint="Orders you hand over will be listed here." />
        : <EmptyState icon="inbox" title={linkedId ? 'That order is not waiting here' : 'No frame orders waiting'}
            hint="Frames ordered on the website show up here until they are collected." />}
      renderItem={({ item }) => (
        <OrderCard order={item} onDone={() => qc.invalidateQueries({ queryKey: ['web-orders'] })} />
      )}
    />
  )
}

function OrderCard({ order, onDone }: { order: WebOrder; onDone: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const next = NEXT[order.status]

  async function move(status: string) {
    setBusy(true)
    setError(null)
    try {
      await api.patch(`/admin/deliveries/${order.id}/status`, { status })
      onDone()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    Alert.alert('Cancel this order?', 'The customer is told on WhatsApp and the frame goes back on sale.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel order', style: 'destructive', onPress: () => move('CANCELLED') },
    ])
  }

  return (
    <Card style={{ marginBottom: spacing.md, gap: spacing.sm }}>
      <Text style={styles.name}>{order.customerName ?? 'Unnamed customer'}</Text>
      <View style={styles.badges}>
        <Badge label={STAGE_LABEL[order.status] ?? order.status}
          tone={order.status === 'PACKED' || order.status === 'SHIPPED' ? 'warning' : order.status === 'DELIVERED' ? 'success' : 'accent'} />
        {order.paidAt ? <Badge label="Paid" tone="success" /> : <Badge label={`Pay at pickup ${formatKwacha(order.totalMinor)}`} tone="warning" />}
      </View>
      <Text style={styles.detail}>{order.orderNo} · {new Date(order.createdAt).toLocaleDateString()}{order.fulfilStoreName ? ` · ${order.fulfilStoreName}` : ''}</Text>
      {order.items.map((line) => <Text key={line} style={styles.item}>{line}</Text>)}
      <Text style={styles.price}>{formatKwacha(order.totalMinor)}</Text>
      <View style={styles.row}>
        {order.customerPhone && (
          <Button label="Call" icon="phone" variant="secondary" style={{ flex: 1 }}
            onPress={() => Linking.openURL(`tel:${order.customerPhone}`)} />
        )}
        {order.leadId && (
          <Button label="Lead history" icon="clock" variant="secondary" style={{ flex: 1 }}
            onPress={() => router.push(`/lead/${order.leadId}`)} />
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {next && <Button label={busy ? 'Saving…' : next.label} onPress={() => move(next.status)} loading={busy} />}
      {next && !order.paidAt && <Button label="Cancel order" variant="ghost" onPress={cancel} disabled={busy} />}
    </Card>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.text },
  detail: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  item: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  price: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted },
})
