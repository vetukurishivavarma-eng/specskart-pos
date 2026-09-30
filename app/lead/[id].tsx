import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { RxTable } from '../../src/components/RxTable'
import { api, apiError } from '../../src/lib/api'
import { colors, font, formatKwacha, spacing } from '../../src/theme'
import { Badge, Button, Card, Field, Loading, SectionLabel, Title } from '../../src/ui/components'

type LensOrder = {
  id: string; ref: string; stage: string; createdAt: string; updatedAt: string
  lensType: string; blueBlock: boolean; lensStructure: string | null; addPower: number | null
  sphRight: number | null; cylRight: number | null; axisRight: number | null
  sphLeft: number | null; cylLeft: number | null; axisLeft: number | null
  specialAxis: boolean; customerName: string | null; age: number | null; gender: string | null
  priceMinor: number | null; paid: boolean; shopName: string | null
}
type Detail = {
  lead: { id: string; name: string | null; whatsappNumber: string; source: string; campaignName: string | null
    status: string; createdAt: string; lastContactAt: string | null; leadTemperature: string }
  timeline: { at: string; type: string; metadata: Record<string, any> | null }[]
  notes: { id: string; body: string; authorEmail: string; createdAt: string }[]
  whatsappMessages: { at: string; direction: string; body: string | null; status: string | null }[]
  lensOrders: LensOrder[]
  lensLink: string
}

// What each tracked step means to someone following up. WhatsApp message events are left out:
// the messages themselves are in the timeline with their text.
const STEP: Record<string, string> = {
  AD_LANDING: 'Came in from an ad',
  WHATSAPP_CONVERSATION_STARTED: 'Started a WhatsApp chat',
  LENS_LINK_OPENED: 'Opened their lens link',
  LENS_STARTED: 'Started a lens order',
  LENS_RX_ENTERED: 'Entered their prescription',
  LENS_QUOTED: 'Checked the price',
  LENS_ORDERED: 'Placed the order',
  LENS_PAID: 'Paid online',
  LENS_READY: 'Order marked ready for pickup',
  LENS_COLLECTED: 'Collected their lenses',
  LENS_CANCELLED: 'Order cancelled',
  FRAME_FINDER_OPENED: 'Opened the frame finder',
  FACE_ANALYSIS_COMPLETED: 'Finished the face scan',
  RECOMMENDATION_VIEWED: 'Looked at frame picks',
  PRODUCTS_SHOWN: 'Was shown products',
  ORDER_PLACED: 'Placed a frames order',
  ORDER_PAID: 'Paid a frames order',
  WHATSAPP_NURTURE_SENT: 'Automatic follow-up sent',
  WHATSAPP_FOLLOW_UP_SENT: 'Follow-up sent',
  EYE_TEST_RECALL_SENT: 'Eye-test reminder sent',
  LEAD_CONVERTED: 'Became a customer',
}
const HIDDEN = new Set(['WHATSAPP_MESSAGE_RECEIVED', 'WHATSAPP_AUTOREPLY_SENT'])
const LENS_NAME: Record<string, string> = { CLEAR: 'Clear', PHOTOCHROMATIC: 'Colormatic (photochromatic)' }

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => (await api.get<Detail>(`/admin/leads/${id}`)).data,
  })
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  if (isLoading) return <Loading />
  if (!data) return <Text style={styles.muted}>{apiError(error)}</Text>

  const { lead } = data
  const number = lead.whatsappNumber.replace(/\D/g, '')
  const first = (lead.name ?? '').split(' ')[0]
  const opened = data.timeline.some((t) => t.type === 'LENS_LINK_OPENED')
  const stage = data.lensOrders[0]?.stage ?? (opened ? 'Opened lens link, not started' : 'No lens order yet')

  const steps = [
    ...data.timeline.filter((t) => !HIDDEN.has(t.type)).map((t) => ({
      at: t.at, kind: 'step' as const, text: STEP[t.type] ?? t.type.replace(/_/g, ' ').toLowerCase(), meta: t.metadata,
    })),
    ...data.whatsappMessages.map((m) => ({
      at: m.at, kind: m.direction === 'INBOUND' ? ('in' as const) : ('out' as const), text: m.body ?? '(media)', meta: null,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  async function addNote() {
    if (!note.trim()) return
    setSaving(true)
    try {
      await api.post(`/admin/leads/${id}/notes`, { body: note.trim() })
      setNote('')
      qc.invalidateQueries({ queryKey: ['lead', id] })
    } finally {
      setSaving(false)
    }
  }

  const sendLink = () => Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(
    `Hi${first ? ' ' + first : ''}! Here's your personal link to pick your lenses — no need to verify again:\n${data.lensLink}`)}`)

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Title>{lead.name || 'Unknown'}</Title>
        <Text style={styles.muted}>+{number} · since {new Date(lead.createdAt).toLocaleDateString()}
          {lead.campaignName ? ` · ${lead.campaignName}` : ''}</Text>
        <View style={styles.badges}>
          <Badge label={stage} tone="accent" />
          <Badge label={lead.leadTemperature.toLowerCase()} tone={lead.leadTemperature === 'HOT' ? 'danger' : 'neutral'} />
          <Badge label={lead.source} tone="info" />
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="WhatsApp" icon="message-circle" onPress={() => Linking.openURL(`https://wa.me/${number}`)} style={{ flex: 1 }} />
        <Button label="Call" icon="phone" variant="secondary" onPress={() => Linking.openURL(`tel:+${number}`)} style={{ flex: 1 }} />
      </View>
      <Button label="Send their personal lens link" icon="link" variant="ghost" onPress={sendLink} />

      <View>
        <SectionLabel>Lens orders</SectionLabel>
        {data.lensOrders.length === 0 && <Text style={styles.muted}>None yet.</Text>}
        {data.lensOrders.map((o) => (
          <Card key={o.id} style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
            <View style={styles.between}>
              <Text style={styles.bold}>{o.ref}</Text>
              <Badge label={o.stage} tone={o.stage.startsWith('Ordered') || o.stage === 'Collected' ? 'success' : 'warning'} />
            </View>
            <Text style={styles.muted}>
              {LENS_NAME[o.lensType] ?? o.lensType}{o.blueBlock ? ' + blue block' : ''}
              {o.lensStructure ? ` · ${o.lensStructure.toLowerCase()}` : ''}
              {o.priceMinor != null ? ` · ${formatKwacha(o.priceMinor)}` : ''}{o.paid ? ' · paid' : ''}
            </Text>
            {(o.customerName || o.age || o.gender) && (
              <Text style={styles.muted}>{[o.customerName, o.age && `${o.age} yrs`, o.gender].filter(Boolean).join(' · ')}</Text>
            )}
            <RxTable rx={o} />
            {o.specialAxis && <Badge label="Special axis — not a stock lens" tone="warning" />}
            <Text style={styles.faint}>Started {new Date(o.createdAt).toLocaleString()} · last step {new Date(o.updatedAt).toLocaleString()}</Text>
          </Card>
        ))}
      </View>

      <View>
        <SectionLabel>Notes</SectionLabel>
        <Card style={{ gap: spacing.sm }}>
          <Field label="Add a follow-up note" value={note} onChangeText={setNote} placeholder="e.g. Called, will come Saturday" multiline />
          {!!note.trim() && <Button label={saving ? 'Saving…' : 'Save note'} onPress={addNote} loading={saving} />}
          {data.notes.map((n) => (
            <View key={n.id} style={{ gap: 2 }}>
              <Text style={styles.body}>{n.body}</Text>
              <Text style={styles.faint}>{n.authorEmail} · {new Date(n.createdAt).toLocaleString()}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View>
        <SectionLabel>Every step, newest first</SectionLabel>
        <Card style={{ gap: spacing.md }}>
          {steps.length === 0 && <Text style={styles.muted}>Nothing recorded yet.</Text>}
          {steps.map((s, i) => (
            <View key={i} style={{ gap: 2 }}>
              <Text style={s.kind === 'step' ? styles.bold : styles.body}>
                {s.kind === 'in' ? '💬 They said: ' : s.kind === 'out' ? '↩ We sent: ' : '• '}{s.text}
              </Text>
              {s.meta?.rx && <Text style={styles.muted}>{s.meta.rx}</Text>}
              {s.meta?.price && <Text style={styles.muted}>{s.meta.price}{s.meta.ref ? ` · ${s.meta.ref}` : ''}</Text>}
              {s.meta?.via && <Text style={styles.muted}>via {s.meta.via}</Text>}
              <Text style={styles.faint}>{new Date(s.at).toLocaleString()}</Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bold: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 14, color: colors.text },
  muted: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  faint: { fontFamily: font.regular, fontSize: 11, color: colors.textFaint },
})
