import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Image, KeyboardAvoidingView, Modal, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, apiError, assetUrl } from '../../src/lib/api'
import { useAuth } from '../../src/lib/auth'
import { colors, font, radius, spacing } from '../../src/theme'
import { Badge, Button, Field, Loading } from '../../src/ui/components'

type Chat = {
  waId: string; name: string | null; known: boolean
  windowOpen: boolean; templateAvailable: boolean; botQuietUntil: string | null
  messages: { at: string; direction: 'INBOUND' | 'OUTBOUND'; body: string; type: string; mediaId?: string }[]
}

/**
 * WhatsApp chat with a customer, sent FROM THE BUSINESS NUMBER through the server.
 *
 * The business number is on Meta's Cloud API, so it can't be opened in a phone's WhatsApp app —
 * a wa.me link opens the staff member's personal WhatsApp instead. Replies come back through the
 * webhook, so this screen polls while it is open.
 */
export default function ChatScreen() {
  const { waId, text } = useLocalSearchParams<{ waId: string; text?: string }>()
  const qc = useQueryClient()
  const [draft, setDraft] = useState(typeof text === 'string' ? text : '')
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const scroll = useRef<ScrollView>(null)
  const token = useAuth((s) => s.token)

  const key = ['chat', waId]
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get<Chat>(`/admin/chat/${waId}`)).data,
    refetchInterval: 8000,
  })

  const act = useMutation({
    mutationFn: async (what: 'send' | 'template' | 'bot') =>
      (await (what === 'send'
        ? api.post<Chat>(`/admin/chat/${waId}/messages`, { body: draft.trim() })
        : api.post<Chat>(`/admin/chat/${waId}/${what}`))).data,
    onSuccess: (chat, what) => {
      qc.setQueryData(key, chat)
      if (what === 'send') setDraft('')
      setError(null)
    },
    onError: (e) => setError(apiError(e)),
  })

  const count = data?.messages.length ?? 0
  useEffect(() => { scroll.current?.scrollToEnd({ animated: false }) }, [count])

  if (isLoading || !data) return <Loading />

  const title = data.name || `+${data.waId}`
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
        {data.messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.direction === 'INBOUND' ? styles.in : styles.out]}>
            {m.type === 'image' && m.mediaId ? (() => {
              // the server fetches it from WhatsApp; tap opens it full screen
              const uri = assetUrl(`/api/admin/chat/${data.waId}/media/${m.mediaId}`)
              return (
                <Pressable onPress={() => setViewing(uri)}>
                  <Image source={{ uri, headers: { Authorization: `Bearer ${token}` } }} style={styles.photo} resizeMode="cover" />
                </Pressable>
              )
            })() : <Text style={styles.body}>{m.body || '(media)'}</Text>}
            <Text style={styles.time}>
              {m.direction === 'OUTBOUND' ? (m.type === 'agent' ? 'Staff · ' : 'Bot · ') : ''}
              {new Date(m.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewing(null)}>
          {viewing && <Image source={{ uri: viewing, headers: { Authorization: `Bearer ${token}` } }}
            style={{ width: '100%', height: '100%' }} resizeMode="contain" />}
        </Pressable>
      </Modal>

      <View style={styles.composer}>
        {error && <Text style={styles.error}>{error}</Text>}
        {data.windowOpen ? (
          <>
            <Field label="Message" value={draft} onChangeText={setDraft} placeholder="Type a message" multiline />
            <View style={styles.row}>
              {data.botQuietUntil && (
                <Button label="Hand back to bot" variant="ghost" style={{ flex: 1 }}
                  onPress={() => act.mutate('bot')} disabled={act.isPending} />
              )}
              <Button label="Send" icon="send" style={{ flex: 1 }} disabled={!draft.trim()}
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
  photo: { width: 220, height: 220, borderRadius: radius.md, backgroundColor: colors.border },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  time: { fontFamily: font.regular, fontSize: 10, color: colors.textFaint },
  composer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  row: { flexDirection: 'row', gap: spacing.sm },
  muted: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  error: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
})
