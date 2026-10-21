import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { colors, font, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Field, ListRow, SectionLabel, Title } from '../src/ui/components'

type Spin = {
  code: string; prize: string; customer: string | null; phone: string | null; spunAt: string
  expiresAt: string; redeemedAt: string | null; redeemedBy: string | null
  state: 'VALID' | 'USED' | 'EXPIRED' | 'WAITING_FRIEND'
}

const BADGE: Record<Spin['state'], { label: string; tone: 'success' | 'neutral' | 'danger' | 'warning' }> = {
  VALID: { label: 'Valid', tone: 'success' },
  USED: { label: 'Used', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'danger' },
  WAITING_FRIEND: { label: 'Locked', tone: 'warning' },
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

function status(s: Spin) {
  if (s.state === 'VALID') return `Valid until ${day(s.expiresAt)}`
  if (s.state === 'USED') return `Used ${day(s.redeemedAt!)}${s.redeemedBy ? ` by ${s.redeemedBy}` : ''}`
  if (s.state === 'EXPIRED') return `Expired ${day(s.expiresAt)}`
  return 'Locked: no new friend has messaged us with this code yet. Do not give the prize.'
}

/** Spin & Win at the till: check a customer's code and mark it used (once). Same as web admin -> Spin & Win. */
export default function Spins() {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [found, setFound] = useState<Spin | null>(null)
  const [busy, setBusy] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['spins'],
    queryFn: async () => (await api.get<Spin[]>('/admin/spins')).data,
  })

  async function check() {
    setBusy(true)
    try {
      pick((await api.get<Spin>(`/admin/spins/code/${encodeURIComponent(code.trim())}`)).data)
    } catch (e) {
      setFound(null)
      Alert.alert('Code not found', apiError(e))
    } finally {
      setBusy(false)
    }
  }

  function pick(s: Spin) {
    setFound(s)
    setPhone('')
    setOtp('')
    setSentTo(null)
  }

  async function sendCode(s: Spin) {
    setBusy(true)
    try {
      const r = await api.post<{ sentTo: string }>(`/admin/spins/code/${encodeURIComponent(s.code)}/send-otp`, { phone })
      setSentTo(r.data.sentTo)
    } catch (e) {
      Alert.alert('Could not send the code', apiError(e))
    } finally {
      setBusy(false)
    }
  }

  async function redeem(s: Spin) {
    setBusy(true)
    try {
      const r = await api.post<Spin>(`/admin/spins/code/${encodeURIComponent(s.code)}/redeem`, { phone, otp })
      pick(r.data)
      await qc.invalidateQueries({ queryKey: ['spins'] })
      Alert.alert('Done', `Give the customer: ${r.data.prize}`)
    } catch (e) {
      Alert.alert('Could not use the code', apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data ?? []}
      keyExtractor={(s) => s.code}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
          <Title>Spin & Win</Title>
          <Text style={{ fontFamily: font.medium, color: colors.textMuted }}>
            Type the customer's code (SPIN-XXXXX, or just the 5 letters) and check it. Then ask for the WhatsApp number
            they won with, send them a verification code, and type the code they got.
          </Text>
          <Card style={{ gap: spacing.sm }}>
            <Field label="Customer's code" value={code} onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters" placeholder="SPIN-XXXXX" />
            <Button label="Check code" icon="search" loading={busy && !found} disabled={!code.trim()} onPress={check} />
          </Card>
          {found && (
            <Card style={{ gap: spacing.sm }}>
              <ListRow icon="gift" title={found.prize} subtitle={found.customer ?? 'Customer'}
                trailing={<Badge label={BADGE[found.state].label} tone={BADGE[found.state].tone} />} />
              <Text style={{ fontFamily: font.medium, color: found.state === 'VALID' ? colors.text : colors.textMuted }}>{status(found)}</Text>
              {found.state === 'VALID' && (
                <>
                  <Field label="Their WhatsApp number" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                    hint="Ask the customer. It must be the number they won with." />
                  <Button label={sentTo ? 'Send code again' : 'Send verification code'} icon="send" variant={sentTo ? 'ghost' : undefined}
                    loading={busy && !sentTo} disabled={!phone.trim()} onPress={() => sendCode(found)} />
                  {sentTo && (
                    <>
                      <Field label={`6-digit code sent to ${sentTo}`} value={otp} keyboardType="number-pad"
                        onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} />
                      <Button label="Give the prize & mark used" icon="check" loading={busy} disabled={otp.length !== 6} onPress={() => redeem(found)} />
                    </>
                  )}
                </>
              )}
            </Card>
          )}
          <SectionLabel>Latest spins</SectionLabel>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="gift" title="No spins yet" hint="Customers type “spin” on WhatsApp to play." />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <ListRow icon="gift" title={`${item.code} · ${item.prize}`}
            subtitle={`${item.customer ?? item.phone} · spun ${day(item.spunAt)}`}
            trailing={<Badge label={BADGE[item.state].label} tone={BADGE[item.state].tone} />}
            onPress={() => { setCode(item.code); pick(item) }} />
        </Card>
      )}
    />
  )
}
