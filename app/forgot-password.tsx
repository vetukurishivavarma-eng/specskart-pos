import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { api } from '../src/lib/api'
import { colors, font, spacing } from '../src/theme'
import { Button, Field, Subtitle, Title } from '../src/ui/components'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!email.trim()) return
    setBusy(true)
    try {
      // Always shows success regardless of whether the email matches an account
      // (no enumeration) — the backend notifies staff over WhatsApp to reset it.
      await api.post('/auth/forgot-password', { email: email.trim() })
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1, justifyContent: 'center' }}>
        <Title>Check with your admin</Title>
        <Subtitle>If that email has an account, an admin has been notified over WhatsApp to reset your password.</Subtitle>
        <Button label="Back to sign in" onPress={() => router.replace('/login')} />
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Title>Forgot password</Title>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted }}>
        Enter your account email — an admin will be alerted to reset your password for you.
      </Text>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Button label={busy ? 'Sending…' : 'Send request'} onPress={submit} disabled={!email.trim()} loading={busy} size="lg" />
    </ScrollView>
  )
}
