import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { colors, font, spacing } from '../src/theme'
import { Button, Card, Field, Title, Toggle } from '../src/ui/components'

type Result = { sent: number; failed: number; skippedOverCap: number }

/**
 * Admin only (the server refuses anyone else): send one Meta-approved template to many leads at
 * once. Same as web admin -> Broadcast. Each delivered message is paid by Meta, and nobody gets the
 * same template twice, so running it again only reaches the people it hasn't yet.
 */
export default function Broadcast() {
  const [template, setTemplate] = useState('')
  const [params, setParams] = useState('')
  const [image, setImage] = useState('')
  const [skipBuyers, setSkipBuyers] = useState(true)
  const [optedInOnly, setOptedInOnly] = useState(false)
  const [limit, setLimit] = useState('200')
  const [reach, setReach] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const max = Math.min(500, Math.max(1, Number(limit) || 1))
  const body = () => ({
    templateName: template.trim(),
    bodyParams: params.split('\n').map((s) => s.trim()).filter(Boolean),
    headerImageUrl: image.trim() || undefined,
    excludeConverted: skipBuyers,
    optedInOnly,
    limit: max,
  })
  const changed = <T,>(set: (v: T) => void) => (v: T) => { set(v); setReach(null); setResult(null) }

  async function preview() {
    setBusy(true)
    try {
      setReach((await api.post<{ eligible: number }>('/admin/whatsapp/broadcast/preview', body())).data.eligible)
    } catch (e) {
      Alert.alert('Could not count', apiError(e))
    } finally {
      setBusy(false)
    }
  }

  function send() {
    const n = Math.min(max, reach ?? 0)
    Alert.alert('Send broadcast?', `"${template.trim()}" to ${n} customer(s).\n\nMeta charges for each message delivered. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        style: 'destructive',
        onPress: async () => {
          setBusy(true)
          try {
            setResult((await api.post<Result>('/admin/whatsapp/broadcast/send', body())).data)
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

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Title>WhatsApp broadcast</Title>
      <Text style={{ fontFamily: font.medium, color: colors.textMuted }}>
        Send an approved template (from Meta WhatsApp Manager) to many customers at once. People who replied STOP are
        always left out, and nobody gets the same template twice.
      </Text>

      <Card style={{ gap: spacing.sm }}>
        <Field label="Approved template name" value={template} onChangeText={changed(setTemplate)} autoCapitalize="none"
          placeholder="e.g. spin_and_win" hint="Exactly as it shows in WhatsApp Manager, and approved." />
        <Field label="Template values (optional)" value={params} onChangeText={changed(setParams)} multiline
          hint="Only if the template has {{1}}, {{2}}…: one per line, in order." />
        <Field label="Header image link (optional)" value={image} onChangeText={changed(setImage)} autoCapitalize="none"
          keyboardType="url" hint="Only if the template has an image header." />
        <Toggle label="Skip customers who already bought" value={skipBuyers} onChange={changed(setSkipBuyers)} />
        <Toggle label="Only customers who signed up for offers" hint="Walk-ins who scanned the shop QR" value={optedInOnly} onChange={changed(setOptedInOnly)} />
        <Field label="Max messages this time" value={limit} onChangeText={changed(setLimit)} keyboardType="number-pad"
          hint="Up to 500. Run it again later to reach the rest." />
      </Card>

      <Button label="Count who it reaches" icon="users" variant="secondary" loading={busy && reach === null} disabled={!template.trim()} onPress={preview} />
      {reach !== null && (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: font.semibold, color: colors.text }}>
            {reach === 0 ? 'Nobody left to send this template to.' : `Reaches ${reach} customer(s)${reach > max ? `; ${max} this time` : ''}.`}
          </Text>
          {reach > 0 && <Button label={`Send to ${Math.min(max, reach)}`} icon="send" loading={busy} onPress={send} />}
        </View>
      )}
      {result && (
        <Card>
          <Text style={{ fontFamily: font.semibold, color: colors.text }}>
            Sent {result.sent}{result.failed ? `, ${result.failed} failed` : ''}
            {result.skippedOverCap ? `. ${result.skippedOverCap} still to go: tap Count again and send.` : '.'}
          </Text>
          {result.failed > 0 && (
            <Text style={{ fontFamily: font.medium, color: colors.textMuted, marginTop: spacing.xs }}>
              If they all failed, check the template name is approved, its values match, and the Meta payment card is active.
            </Text>
          )}
        </Card>
      )}
    </ScrollView>
  )
}
