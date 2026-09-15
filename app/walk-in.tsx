import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { api, apiError } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { colors, spacing } from '../src/theme'
import { Badge, Button, Card, Field, Subtitle, Title } from '../src/ui/components'

type Started = { id: string; code: string; waLink: string; businessNumber: string; expiresAt: string }
type Status = { id: string; verified: boolean; customerName: string | null; whatsappNumber: string | null }

// The customer scans the QR with their phone camera, WhatsApp opens with a prefilled message
// carrying the code, they tap send. That message proves the number is theirs and is their
// opt-in to offers; the server links it and replies. This screen only polls until it lands.
export default function WalkIn() {
  const store = useActiveStore((s) => s.store)
  const [name, setName] = useState('')
  const [started, setStarted] = useState<Started | null>(null)

  const start = useMutation({
    mutationFn: async () =>
      (await api.post<Started>('/admin/pos/walk-ins', { storeId: store?.id ?? null, customerName: name.trim() || null })).data,
    onSuccess: setStarted,
  })

  const status = useQuery({
    queryKey: ['walk-in', started?.id],
    queryFn: async () => (await api.get<Status>(`/admin/pos/walk-ins/${started!.id}`)).data,
    enabled: !!started,
    refetchInterval: (q) => (q.state.data?.verified ? false : 3000),
  })

  const reset = () => {
    setStarted(null)
    setName('')
    start.reset()
  }

  if (started && status.data?.verified) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Title>Customer saved</Title>
        <Card>
          <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: 'flex-start' }}>
            <Badge label="WhatsApp verified" tone="success" />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>{status.data.customerName ?? 'Customer'}</Text>
            <Text style={{ color: colors.textMuted }}>{status.data.whatsappNumber}</Text>
            <Text style={{ color: colors.textMuted }}>Signed up for offers & updates. They can reply STOP any time.</Text>
          </View>
        </Card>
        <Button label="Add another customer" icon="user-plus" onPress={reset} />
      </ScrollView>
    )
  }

  if (started) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, alignItems: 'center' }}>
        <Title>Ask them to scan</Title>
        <Subtitle>With their phone camera — WhatsApp opens, they tap send.</Subtitle>
        <View style={{ padding: spacing.lg, backgroundColor: '#ffffff', borderRadius: 16 }}>
          <QRCode value={started.waLink} size={240} />
        </View>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
          No camera? They can WhatsApp{' '}
          <Text style={{ fontWeight: '700', color: colors.primary }}>{started.code}</Text> to {started.businessNumber}
        </Text>
        <Badge label="Waiting for their message…" tone="warning" />
        <Button label="Cancel" variant="ghost" onPress={reset} />
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
      <Title>Add walk-in customer</Title>
      <Subtitle>Verifies their WhatsApp number and signs them up for offers — no OTP, no typing their number.</Subtitle>
      <Field label="Customer name (optional)" value={name} onChangeText={setName} placeholder="e.g. Mwila Phiri" autoCapitalize="words" />
      {start.isError && <Text style={{ color: colors.textMuted }}>{apiError(start.error)}</Text>}
      <Button label="Show WhatsApp QR" icon="maximize" size="lg" loading={start.isPending} onPress={() => start.mutate()} />
    </ScrollView>
  )
}
