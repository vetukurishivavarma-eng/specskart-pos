import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { api, apiError, assetUrl } from '../lib/api'
import { useAuth } from '../lib/auth'
import { colors, font, spacing } from '../theme'
import { Badge, Button, Card, Field, SectionLabel } from '../ui/components'
import { AuthedPhoto } from './AuthedPhoto'
import { num } from '../lib/lens'
import { RxTable, type Rx } from './RxTable'

export type Entry = Rx & {
  id: string; kind: 'ONLINE' | 'SHOP' | 'SAVED'; at: string; pd: string | null
  ref?: string; shopName?: string | null; lensStructure?: string | null; hasPhoto: boolean; savedBy?: string | null
}

const KIND: Record<Entry['kind'], string> = { ONLINE: 'Online order', SHOP: 'Shop sale', SAVED: 'WhatsApp photo' }

/** Every prescription we hold for this customer, newest first: online orders, counter sales (by number)
 *  and chat photos staff saved -- so nobody scrolls back through months of chat. */
export function Prescriptions({ leadId }: { leadId: string }) {
  const token = useAuth((s) => s.token)
  const isAdmin = useAuth((s) => s.user?.role === 'ADMIN')
  const qc = useQueryClient()
  const [viewing, setViewing] = useState<string | null>(null)
  const [typing, setTyping] = useState<string | null>(null)
  const { data, error } = useQuery({
    queryKey: ['prescriptions', leadId],
    queryFn: async () => (await api.get<Entry[]>(`/admin/leads/${leadId}/prescriptions`)).data,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['prescriptions', leadId] })

  function remove(e: Entry) {
    Alert.alert('Remove this saved photo?', 'The photo and any numbers typed from it are deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/admin/leads/${leadId}/prescriptions/${e.id}`); refresh() }
          catch (err) { Alert.alert('Could not remove', apiError(err)) }
        },
      },
    ])
  }

  return (
    <View>
      <SectionLabel>Prescriptions</SectionLabel>
      {error ? <Text style={styles.muted}>{apiError(error)}</Text> : null}
      {data?.length === 0 && (
        <Text style={styles.muted}>None yet. When they send a photo of their prescription, tap "Save as prescription" under it in the chat.</Text>
      )}
      {data?.map((e) => (
        <Card key={e.id} style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
          <View style={styles.between}>
            <Badge label={KIND[e.kind]} tone={e.kind === 'SAVED' ? 'info' : 'accent'} />
            <Text style={styles.faint}>{new Date(e.at).toLocaleDateString()}</Text>
          </View>
          {(e.ref || e.shopName) && <Text style={styles.muted}>{[e.ref, e.shopName].filter(Boolean).join(' · ')}</Text>}
          {e.hasPhoto && (
            <AuthedPhoto uri={assetUrl(`/api/admin/leads/${leadId}/prescriptions/${e.id}/photo`)} token={token}
              name={`rx-${e.id}`} size={160} onOpen={setViewing} />
          )}
          {typing === e.id ? (
            <TypeNumbers leadId={leadId} entry={e} onDone={() => { setTyping(null); refresh() }} />
          ) : (
            <>
              {(e.kind !== 'SAVED' || e.sphRight != null || e.sphLeft != null || e.cylRight != null || e.cylLeft != null) && <RxTable rx={e} />}
              {e.pd && <Text style={styles.muted}>PD: {e.pd}</Text>}
              {e.kind === 'SAVED' && (
                <View style={styles.row}>
                  <Button label={e.sphRight == null && e.sphLeft == null ? 'Type the numbers' : 'Edit numbers'} icon="edit-3"
                    variant="secondary" style={{ flex: 1 }} onPress={() => setTyping(e.id)} />
                  {isAdmin && <Button label="Remove" icon="trash-2" variant="ghost" onPress={() => remove(e)} />}
                </View>
              )}
            </>
          )}
          {e.savedBy && <Text style={styles.faint}>Saved by {e.savedBy}</Text>}
        </Card>
      ))}

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)}>
          {viewing && <Image source={{ uri: viewing }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </View>
  )
}

/** On the counter bill: the last prescription on file for the number being typed, one tap to reuse it. */
export function LastPrescription({ phone, onUse }: { phone: string; onUse: (e: Entry) => void }) {
  const digits = phone.replace(/\D/g, '')
  const { data } = useQuery({
    queryKey: ['prescriptions', 'phone', digits],
    queryFn: async () => (await api.get<Entry[]>('/admin/prescriptions', { params: { phone: digits } })).data,
    enabled: digits.length >= 9,
  })
  const withNumbers = (data ?? []).filter((e) => [e.sphRight, e.sphLeft, e.cylRight, e.cylLeft].some((v) => v != null))
  const last = withNumbers[0]
  if (!last) return null
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.between}>
        <Text style={styles.bold}>Last prescription on file</Text>
        <Text style={styles.faint}>{KIND[last.kind]} · {new Date(last.at).toLocaleDateString()}</Text>
      </View>
      <RxTable rx={last} />
      {last.pd && <Text style={styles.muted}>PD: {last.pd}</Text>}
      {withNumbers.length > 1 && <Text style={styles.faint}>{withNumbers.length - 1} older one(s) on their lead screen.</Text>}
      <Button label="Use these numbers" icon="copy" variant="secondary" onPress={() => onUse(last)} />
    </View>
  )
}

export const str = (v: number | null) => (v == null ? '' : String(v))

function TypeNumbers({ leadId, entry, onDone }: { leadId: string; entry: Entry; onDone: () => void }) {
  const [sphR, setSphR] = useState(str(entry.sphRight))
  const [sphL, setSphL] = useState(str(entry.sphLeft))
  const [cylR, setCylR] = useState(str(entry.cylRight))
  const [cylL, setCylL] = useState(str(entry.cylLeft))
  const [axisR, setAxisR] = useState(str(entry.axisRight))
  const [axisL, setAxisL] = useState(str(entry.axisLeft))
  const [add, setAdd] = useState(str(entry.addPower))
  const [pd, setPd] = useState(entry.pd ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    try {
      const axis = (v: string) => (v.trim() ? parseInt(v, 10) : null)
      await api.put(`/admin/leads/${leadId}/prescriptions/${entry.id}`, {
        sphRight: num(sphR), sphLeft: num(sphL), cylRight: num(cylR), cylLeft: num(cylL),
        axisRight: axis(axisR), axisLeft: axis(axisL), addPower: num(add), pd: pd.trim() || null,
      })
      onDone()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}><Field label="SPH right" value={sphR} onChangeText={setSphR} keyboardType="numbers-and-punctuation" placeholder="-2.50" /></View>
        <View style={{ flex: 1 }}><Field label="SPH left" value={sphL} onChangeText={setSphL} keyboardType="numbers-and-punctuation" placeholder="-2.50" /></View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}><Field label="CYL right" value={cylR} onChangeText={setCylR} keyboardType="numbers-and-punctuation" placeholder="-0.75" /></View>
        <View style={{ flex: 1 }}><Field label="CYL left" value={cylL} onChangeText={setCylL} keyboardType="numbers-and-punctuation" placeholder="-0.75" /></View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}><Field label="Axis right" value={axisR} onChangeText={setAxisR} keyboardType="number-pad" placeholder="0–180" /></View>
        <View style={{ flex: 1 }}><Field label="Axis left" value={axisL} onChangeText={setAxisL} keyboardType="number-pad" placeholder="0–180" /></View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}><Field label="Add" value={add} onChangeText={setAdd} keyboardType="decimal-pad" placeholder="+2.00" /></View>
        <View style={{ flex: 1 }}><Field label="PD" value={pd} onChangeText={setPd} keyboardType="numbers-and-punctuation" placeholder="62" /></View>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.row}>
        <Button label="Cancel" variant="ghost" style={{ flex: 1 }} onPress={onDone} />
        <Button label="Save numbers" icon="check" style={{ flex: 1 }} loading={busy} onPress={save} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bold: { fontFamily: font.semibold, fontSize: 14, color: colors.text },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  muted: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  faint: { fontFamily: font.regular, fontSize: 11, color: colors.textFaint },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
})
