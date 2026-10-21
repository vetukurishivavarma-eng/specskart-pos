import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { colors, font, radius, spacing } from '../src/theme'
import { Button, Card, Field, Icon, Title, Toggle } from '../src/ui/components'

type Result = { sent: number; failed: number; skippedOverCap: number }

/**
 * Ready messages = templates approved in Meta (the only thing WhatsApp delivers to everyone).
 * To add one: get it approved in WhatsApp Manager, then add a line here with the same name.
 */
const READY = [
  {
    template: 'spin_and_win',
    title: 'Spin & Win',
    text: '🎁 New at Specskart Opticians: Spin & Win! Every spin wins a prize: K100 off photochromatic lenses, free sunglasses, 20% off a second frame and more. Tap Spin below to play.',
    // sent instead (free) to customers who messaged in the last 24h; only the rest get the paid template
    free: '🎁 New at Specskart Opticians: Spin & Win! Every spin wins a prize: K100 off photochromatic lenses, free sunglasses, 20% off a second frame and more. Reply *Spin* to play.',
  },
]

type Mode = 'ready' | 'own'

/** Admin only (the server refuses anyone else): one message to many customers at once. */
export default function Broadcast() {
  const [mode, setMode] = useState<Mode>('ready')
  const [ready, setReady] = useState(READY[0])
  const [text, setText] = useState('')
  const [skipBuyers, setSkipBuyers] = useState(false)
  const [reach, setReach] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const reset = () => { setReach(null); setResult(null) }
  const path = mode === 'ready' ? '/admin/whatsapp/broadcast' : '/admin/whatsapp/broadcast/text'
  const body = () => mode === 'ready'
    ? { templateName: ready.template, freeText: ready.free, bodyParams: [], excludeConverted: skipBuyers, optedInOnly: false, limit: 200 }
    : { text: text.trim(), excludeConverted: skipBuyers, limit: 200 }

  async function count() {
    setBusy(true)
    try {
      setReach((await api.post<{ eligible: number }>(`${path}/preview`, body())).data.eligible)
    } catch (e) {
      Alert.alert('Could not count', apiError(e))
    } finally {
      setBusy(false)
    }
  }

  function send() {
    const n = Math.min(200, reach ?? 0)
    const cost = mode === 'ready' ? '\n\nCustomers who chatted in the last 24 hours get it free; for the rest Meta charges a small fee each.' : ''
    Alert.alert('Send this message?', `It goes to ${n} customer(s) on WhatsApp.${cost}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setBusy(true)
          try {
            setResult((await api.post<Result>(`${path}/send`, body())).data)
            setReach(null)
          } catch (e) {
            Alert.alert('Could not send', apiError(e))
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  const canCount = mode === 'ready' || text.trim().length > 0

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Title>Message many customers</Title>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Choice active={mode === 'ready'} icon="star" title="Ready message" sub="Goes to all customers"
          onPress={() => { setMode('ready'); reset() }} />
        <Choice active={mode === 'own'} icon="edit-3" title="Type your own" sub="Recent chats only, free"
          onPress={() => { setMode('own'); reset() }} />
      </View>

      {mode === 'ready' ? (
        <View style={{ gap: spacing.sm }}>
          {READY.map((r) => (
            <Pressable key={r.template} onPress={() => { setReady(r); reset() }}>
              <Card style={{ gap: spacing.xs, borderWidth: 2, borderColor: ready.template === r.template ? colors.primary : 'transparent' }}>
                <Text style={{ fontFamily: font.semibold, color: colors.text }}>{r.title}</Text>
                <Text style={{ fontFamily: font.medium, color: colors.textMuted }}>{r.text}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card style={{ gap: spacing.sm }}>
          <Field label="Your message" value={text} onChangeText={(t) => { setText(t); reset() }} multiline
            placeholder="e.g. We're open on Sunday 10:00–14:00. Come in for your free eye test!" />
          <Text style={{ fontFamily: font.medium, color: colors.textMuted }}>
            WhatsApp only lets a typed message reach customers who messaged us in the last 24 hours, so it goes to them
            (and it's free). To reach everyone, use a ready message.
          </Text>
        </Card>
      )}

      <Toggle label="Skip customers who already bought" value={skipBuyers} onChange={(v) => { setSkipBuyers(v); reset() }} />

      <Button label="Check how many it reaches" icon="users" variant="secondary" loading={busy && reach === null}
        disabled={!canCount} onPress={count} />
      {reach !== null && (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: font.semibold, color: colors.text }}>
            {reach === 0 ? 'Nobody to send this to right now (or they all have it already).' : `Reaches ${reach} customer(s)${reach > 200 ? ' — 200 now, then send again for the rest' : ''}.`}
          </Text>
          {reach > 0 && <Button label={`Send to ${Math.min(200, reach)}`} icon="send" loading={busy} onPress={send} />}
        </View>
      )}
      {result && (
        <Card>
          <Text style={{ fontFamily: font.semibold, color: colors.text }}>
            ✅ Sent to {result.sent}{result.failed ? ` (${result.failed} didn't go through)` : ''}.
            {result.skippedOverCap ? ` ${result.skippedOverCap} still to go: tap Check again, then Send.` : ''}
          </Text>
          {result.failed > 0 && result.sent === 0 && mode === 'ready' && (
            <Text style={{ fontFamily: font.medium, color: colors.textMuted, marginTop: spacing.xs }}>
              None went through: the message may still be waiting for Meta's approval, or the Meta payment card needs checking.
            </Text>
          )}
        </Card>
      )}
      <Text style={{ fontFamily: font.medium, color: colors.textMuted, fontSize: 12 }}>
        Customers who replied STOP never get these, and nobody gets the same message twice.
      </Text>
    </ScrollView>
  )
}

function Choice({ active, icon, title, sub, onPress }: { active: boolean; icon: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{
      flex: 1, padding: spacing.md, borderRadius: radius.lg, gap: 4,
      backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border,
    }}>
      <Icon name={icon as never} size={20} color={active ? '#fff' : colors.text} />
      <Text style={{ fontFamily: font.semibold, color: active ? '#fff' : colors.text }}>{title}</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 12, color: active ? 'rgba(255,255,255,.8)' : colors.textMuted }}>{sub}</Text>
    </Pressable>
  )
}
