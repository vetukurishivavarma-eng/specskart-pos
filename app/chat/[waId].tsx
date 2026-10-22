import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { Stack, useLocalSearchParams } from 'expo-router'
import * as IntentLauncher from 'expo-intent-launcher'
import { useEffect, useRef, useState } from 'react'
import { Image, KeyboardAvoidingView, Modal, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, apiError, assetUrl } from '../../src/lib/api'
import { useAuth } from '../../src/lib/auth'
import { colors, font, radius, spacing } from '../../src/theme'
import { AuthedPhoto, downloadMedia } from '../../src/components/AuthedPhoto'
import { Badge, Button, Field, Icon, Loading } from '../../src/ui/components'

type Message = {
  id: string; at: string; direction: 'INBOUND' | 'OUTBOUND'; body: string; type: string; mediaId?: string
  status: string; canReply: boolean; replyTo?: string
}
type Chat = {
  waId: string; name: string | null; known: boolean
  windowOpen: boolean; templateAvailable: boolean; botQuietUntil: string | null
  messages: Message[]
}
type Attachment = { uri: string; name: string; type: string }

/**
 * WhatsApp chat with a customer, sent FROM THE BUSINESS NUMBER through the server.
 *
 * The business number is on Meta's Cloud API, so it can't be opened in a phone's WhatsApp app —
 * a wa.me link opens the staff member's personal WhatsApp instead. Replies come back through the
 * webhook, so this screen polls while it is open. Long-press a message to reply, react or copy.
 */
const MEDIA_LABEL: Record<string, string> = { document: 'Document', video: 'Video', audio: 'Voice note' }
const EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '👓']
// what staff send from this screen (the bot's own messages have none of these)
const STAFF_TYPES = new Set(['agent', 'reaction', 'image', 'document', 'video', 'audio'])

function Ticks({ status }: { status: string }) {
  if (status === 'failed') return <Text style={[styles.time, { color: colors.danger }]}> · not delivered</Text>
  if (status === 'read') return <Text style={[styles.time, { color: '#34B7F1' }]}> ✓✓</Text>
  if (status === 'delivered') return <Text style={styles.time}> ✓✓</Text>
  if (status === 'sent') return <Text style={styles.time}> ✓</Text>
  return null
}

export default function ChatScreen() {
  const { waId, text } = useLocalSearchParams<{ waId: string; text?: string }>()
  const qc = useQueryClient()
  const [draft, setDraft] = useState(typeof text === 'string' ? text : '')
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [rxSaved, setRxSaved] = useState<Record<string, 'saving' | 'saved'>>({})
  const [picked, setPicked] = useState<Message | null>(null)     // long-pressed: the actions sheet
  const [replyTo, setReplyTo] = useState<Message | null>(null)   // quoted in the next message
  const [attaching, setAttaching] = useState(false)               // the photo / file chooser
  const [file, setFile] = useState<Attachment | null>(null)

  // Keep the photo on the customer (our own copy -- WhatsApp deletes media after ~30 days).
  const saveRx = async (mediaId: string) => {
    setRxSaved((s) => ({ ...s, [mediaId]: 'saving' }))
    try {
      await api.post(`/admin/chat/${waId}/media/${mediaId}/prescription`)
      setRxSaved((s) => ({ ...s, [mediaId]: 'saved' }))
      qc.invalidateQueries({ queryKey: ['prescriptions'] })
      setError(null)
    } catch (e) {
      setRxSaved(({ [mediaId]: _, ...s }) => s)
      setError(apiError(e))
    }
  }

  // Download (with our login) to the cache, then hand it to whichever app opens that type.
  const openMedia = async (uri: string, mediaId: string) => {
    setOpening(mediaId)
    try {
      const f = await downloadMedia(uri, token)
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: f.contentUri, type: f.type || '*/*', flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      })
      setError(null)
    } catch {
      setError("Couldn't open that file — WhatsApp may no longer have it, or no app on this phone opens it.")
    } finally {
      setOpening(null)
    }
  }
  const scroll = useRef<ScrollView>(null)
  const token = useAuth((s) => s.token)

  const key = ['chat', waId]
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<Chat>(`/admin/chat/${waId}`)).data,
    refetchInterval: 8000,
  })

  const act = useMutation({
    mutationFn: async (what: 'send' | 'template' | 'bot') => {
      if (what !== 'send') return (await api.post<Chat>(`/admin/chat/${waId}/${what}`)).data
      if (file) {
        const form = new FormData()
        form.append('file', { uri: file.uri, name: file.name, type: file.type } as any)
        if (draft.trim()) form.append('caption', draft.trim())
        if (replyTo) form.append('replyToId', replyTo.id)
        return (await api.post<Chat>(`/admin/chat/${waId}/attachments`, form,
          { headers: { 'Content-Type': 'multipart/form-data' } })).data
      }
      return (await api.post<Chat>(`/admin/chat/${waId}/messages`, { body: draft.trim(), replyToId: replyTo?.id ?? null })).data
    },
    onSuccess: (chat, what) => {
      qc.setQueryData(key, chat)
      if (what === 'send') { setDraft(''); setReplyTo(null); setFile(null) }
      setError(null)
    },
    onError: (e) => setError(apiError(e)),
  })

  async function react(m: Message, emoji: string) {
    setPicked(null)
    try {
      qc.setQueryData(key, (await api.post<Chat>(`/admin/chat/${waId}/messages/${m.id}/react`, { emoji })).data)
      setError(null)
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function choose(how: 'camera' | 'gallery' | 'file') {
    setAttaching(false)
    if (how === 'file') {
      const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (!r.canceled) {
        const a = r.assets[0]
        setFile({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' })
      }
      return
    }
    const perm = how === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setError('Allow access to send a photo.'); return }
    const r = how === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (!r.canceled) setFile({ uri: r.assets[0].uri, name: 'photo.jpg', type: 'image/jpeg' })
  }

  const count = data?.messages.length ?? 0
  useEffect(() => { scroll.current?.scrollToEnd({ animated: false }) }, [count])

  // Blue ticks for the customer once someone has the chat open -- like reading it on WhatsApp.
  const lastIn = data?.messages.filter((m) => m.direction === 'INBOUND').at(-1)?.id
  useEffect(() => {
    if (lastIn) api.post(`/admin/chat/${waId}/read`).catch(() => {})
  }, [lastIn, waId])

  if (isLoading || !data) return <Loading />

  const title = data.name || `+${data.waId}`
  const copyable = (m: Message) => !!m.body && !m.body.startsWith('[')
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title }} />

      <View style={styles.status}>
        <Badge label="From the business number" tone="accent" />
        {data.botQuietUntil
          ? <Badge label="Bot paused while you chat" tone="warning" />
          : <Badge label="Bot answering" tone="neutral" />}
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {!data.known && (
          <Text style={styles.muted}>
            This customer has never messaged the business number, so there's no chat yet. Ask them to send us a
            WhatsApp, or call them.
          </Text>
        )}
        {data.messages.map((m) => {
          const staff = m.direction === 'OUTBOUND' && STAFF_TYPES.has(m.type)
          return (
            <Pressable key={m.id} onLongPress={() => setPicked(m)} delayLongPress={300}
              style={[styles.bubble, m.direction === 'INBOUND' ? styles.in : styles.out]}>
              {m.replyTo && (
                <View style={styles.quote}><Text style={styles.quoteText} numberOfLines={2}>{m.replyTo}</Text></View>
              )}
              {m.mediaId ? (() => {
                // the server fetches it from WhatsApp; a photo/sticker shows here, anything else opens in the phone's app
                const uri = assetUrl(`/api/admin/chat/${data.waId}/media/${m.mediaId}`)
                return m.type === 'image' || m.type === 'sticker' ? (
                  <View style={{ gap: spacing.xs }}>
                    <AuthedPhoto uri={uri} token={token} onOpen={setViewing} />
                    {m.body && !m.body.startsWith('[') && <Text style={styles.body}>{m.body}</Text>}
                    {m.direction === 'INBOUND' && m.type === 'image' && (
                      <Button variant="ghost" icon={rxSaved[m.mediaId] === 'saved' ? 'check' : 'file-text'}
                        label={rxSaved[m.mediaId] === 'saved' ? 'Saved as prescription' : 'Save as prescription'}
                        loading={rxSaved[m.mediaId] === 'saving'} disabled={!!rxSaved[m.mediaId]}
                        onPress={() => saveRx(m.mediaId!)} />
                    )}
                  </View>
                ) : (
                  <Button label={opening === m.mediaId ? 'Opening…' : // a document's body is its filename; otherwise it's just "[video]" etc.
                    m.body && !m.body.startsWith('[') ? m.body : `${MEDIA_LABEL[m.type] ?? 'File'} — tap to open`}
                    icon="paperclip" variant="secondary" disabled={opening !== null}
                    onPress={() => openMedia(uri, m.mediaId!)} />
                )
              })() : <Text style={styles.body}>{m.body || '(media)'}</Text>}
              <Text style={styles.time}>
                {m.direction === 'OUTBOUND' ? (staff ? 'Staff · ' : 'Bot · ') : ''}
                {new Date(m.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {staff && <Ticks status={m.status} />}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)}>
          {viewing && <Image source={{ uri: viewing }}
            style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
        </Pressable>
      </Modal>

      {/* long-press: reply / react / copy, as in WhatsApp */}
      <Modal visible={!!picked} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <Pressable style={styles.sheetBack} onPress={() => setPicked(null)}>
          <Pressable style={styles.sheet}>
            {picked && (
              <>
                <Text style={styles.muted} numberOfLines={2}>{picked.body || '(media)'}</Text>
                {data.windowOpen && picked.canReply && (
                  <>
                    <View style={styles.emojis}>
                      {EMOJIS.map((e) => (
                        <Pressable key={e} onPress={() => react(picked, e)} style={styles.emoji}>
                          <Text style={{ fontSize: 26 }}>{e}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Button label="Reply" icon="corner-up-left" variant="secondary"
                      onPress={() => { setReplyTo(picked); setPicked(null) }} />
                  </>
                )}
                {copyable(picked) && (
                  <Button label="Copy text" icon="copy" variant="secondary"
                    onPress={() => { Clipboard.setStringAsync(picked.body); setPicked(null) }} />
                )}
                {!data.windowOpen && (
                  <Text style={styles.muted}>Replies and reactions open again once they message within 24 hours.</Text>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={attaching} transparent animationType="fade" onRequestClose={() => setAttaching(false)}>
        <Pressable style={styles.sheetBack} onPress={() => setAttaching(false)}>
          <Pressable style={styles.sheet}>
            <Button label="Take a photo" icon="camera" variant="secondary" onPress={() => choose('camera')} />
            <Button label="Photo from gallery" icon="image" variant="secondary" onPress={() => choose('gallery')} />
            <Button label="Document (PDF, etc.)" icon="file" variant="secondary" onPress={() => choose('file')} />
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.composer}>
        {error && <Text style={styles.error}>{error}</Text>}
        {data.windowOpen ? (
          <>
            {replyTo && (
              <View style={[styles.quote, styles.between]}>
                <Text style={[styles.quoteText, { flex: 1 }]} numberOfLines={2}>Replying to: {replyTo.body || '(media)'}</Text>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={10}><Icon name="x" size={18} color={colors.textMuted} /></Pressable>
              </View>
            )}
            {file && (
              <View style={[styles.quote, styles.between]}>
                {file.type.startsWith('image/')
                  ? <Image source={{ uri: file.uri }} style={{ width: 56, height: 56, borderRadius: 6 }} />
                  : <Text style={[styles.quoteText, { flex: 1 }]} numberOfLines={1}>📎 {file.name}</Text>}
                <Pressable onPress={() => setFile(null)} hitSlop={10}><Icon name="x" size={18} color={colors.textMuted} /></Pressable>
              </View>
            )}
            <Field label={file ? 'Caption (optional)' : 'Message'} value={draft} onChangeText={setDraft}
              placeholder={file ? 'Add a caption' : 'Type a message'} multiline />
            <View style={styles.row}>
              <Button label="" icon="paperclip" variant="secondary" onPress={() => setAttaching(true)} />
              {data.botQuietUntil && (
                <Button label="Hand back to bot" variant="ghost" style={{ flex: 1 }}
                  onPress={() => act.mutate('bot')} disabled={act.isPending} />
              )}
              <Button label="Send" icon="send" style={{ flex: 1 }} disabled={!draft.trim() && !file}
                loading={act.isPending && act.variables === 'send'} onPress={() => act.mutate('send')} />
            </View>
          </>
        ) : data.known ? (
          <>
            <Text style={styles.muted}>
              They haven't messaged in the last 24 hours. WhatsApp only allows an approved template until they reply.
            </Text>
            {data.templateAvailable
              ? <Button label="Send follow-up template" icon="send" loading={act.isPending}
                  onPress={() => act.mutate('template')} />
              : <Text style={styles.muted}>No follow-up template is set up yet (WHATSAPP_FOLLOW_UP_TEMPLATE).</Text>}
          </>
        ) : null}
        <Button label="Call instead" icon="phone" variant="secondary" onPress={() => Linking.openURL(`tel:+${data.waId}`)} />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bubble: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.lg, gap: 4 },
  in: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  out: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft },
  body: { fontFamily: font.regular, fontSize: 14, color: colors.text },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: colors.canvas, borderRadius: 6,
    paddingVertical: 4, paddingHorizontal: spacing.sm, gap: spacing.sm },
  quoteText: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.sm,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  emojis: { flexDirection: 'row', justifyContent: 'space-between' },
  emoji: { padding: spacing.xs },
  time: { fontFamily: font.regular, fontSize: 10, color: colors.textFaint },
  composer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  row: { flexDirection: 'row', gap: spacing.sm },
  muted: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
})
