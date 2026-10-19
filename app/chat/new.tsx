import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { api, apiError } from '../../src/lib/api'
import { colors, spacing } from '../../src/theme'
import { Button, Field, Subtitle, Title } from '../../src/ui/components'

// Message a number that has never messaged the business. WhatsApp only delivers an approved
// template as the first message, so the server sends that; once they reply, chat is free.
export default function NewChat() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')

  const start = useMutation({
    mutationFn: async () =>
      (await api.post<{ waId: string }>(`/admin/chat/${encodeURIComponent(phone.trim())}/start`,
        { name: name.trim() || null })).data,
    onSuccess: (chat) => router.replace(`/chat/${chat.waId}`),
  })

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Title>New chat</Title>
      <Subtitle>
        We send our approved WhatsApp greeting first. When the customer replies, you can chat normally.
      </Subtitle>
      <Field label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
        placeholder="0971234567" autoFocus />
      <Field label="Name (optional)" value={name} onChangeText={setName} autoCapitalize="words" />
      {start.isError && <Text style={{ color: colors.danger }}>{apiError(start.error)}</Text>}
      <Button label="Send greeting" icon="send" loading={start.isPending}
        disabled={phone.replace(/\D/g, '').length < 9} onPress={() => start.mutate()} />
    </ScrollView>
  )
}
