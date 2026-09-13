import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import { Platform } from 'react-native'
import { useState } from 'react'
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api, apiError } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { useAuth } from '../src/lib/auth'
import { deviceName, getDeviceId } from '../src/lib/device'
import { bevel, colors, font, radius, shadow, spacing } from '../src/theme'
import { Button, Icon } from '../src/ui/components'
import { Logo } from '../src/ui/Logo'

export default function Login() {
  const router = useRouter()
  const login = useAuth((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState<'email' | 'password' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const deviceId = await getDeviceId()
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password,
        deviceId,
        deviceName: deviceName(),
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? null,
      })
      await login(data.token, {
        email: data.email, name: data.fullName, role: data.role,
        storeId: data.storeId ?? null, storeName: data.storeName ?? null,
      })
      // A shop-scoped login only ever has one shop -- lock straight to it instead of
      // making them pick it, same as its own backend endpoints already enforce.
      if (data.storeId) {
        try {
          const store = await api.get(`/admin/pos/stores/${data.storeId}`)
          await useActiveStore.getState().select(store.data)
        } catch { /* non-fatal -- they can still pick it manually */ }
      }
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      {/* This is the one dark-wash screen in the app -- every other screen wants dark status
          bar icons (see app/_layout.tsx), this one wants light. Whichever screen is focused
          wins, so this local override only applies here. */}
      <StatusBar style="light" />
      {/* Layered wash: keeps the ink from reading as a flat block. */}
      <View style={styles.washTop} />
      <View style={styles.washGlow} />

      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <View style={styles.mark}>
                <Logo size={56} color={colors.accent} />
              </View>
              <Text style={styles.wordmark}>Specskart POS</Text>
              <Text style={styles.tagline}>Lens pricing &amp; counter sales</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardHint}>Sign in to open the till</Text>

              <Text style={styles.label}>Email</Text>
              <View style={[styles.field, focused === 'email' && styles.fieldFocused]}>
                <Icon name="mail" size={18} color={colors.textFaint} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@specskart.local"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  style={styles.input}
                  editable={!busy}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={[styles.field, focused === 'password' && styles.fieldFocused]}>
                <Icon name="lock" size={18} color={colors.textFaint} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="Your password"
                  placeholderTextColor={colors.textFaint}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.input}
                  editable={!busy}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textFaint} />
                </Pressable>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={15} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Button label="Sign In" size="lg" onPress={submit} loading={busy} style={{ marginTop: spacing.lg }} />
              <Pressable onPress={() => router.push('/forgot-password')} hitSlop={10} style={{ marginTop: spacing.md, alignSelf: 'center' }}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            </View>

            <Text style={styles.footnote}>Specskart</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDeep },
  flex: { flex: 1 },
  washTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '58%', backgroundColor: colors.primaryDeep },
  washGlow: {
    position: 'absolute', top: -140, right: -110, width: 380, height: 380, borderRadius: 190,
    backgroundColor: colors.primaryBright, opacity: 0.35,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  mark: {
    width: 96, height: 96, borderRadius: radius.xl, backgroundColor: colors.brandCard,
    alignItems: 'center', justifyContent: 'center', ...shadow.raised, ...bevel.light,
  },
  wordmark: { fontFamily: font.extrabold, fontSize: 26, color: colors.onDark, marginTop: spacing.md, letterSpacing: -0.6 },
  tagline: {
    fontFamily: font.medium, fontSize: 12, color: colors.onDarkMuted, letterSpacing: 1.8,
    textTransform: 'uppercase', marginTop: 4,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, ...shadow.raised, ...bevel.light },
  cardTitle: { fontFamily: font.bold, fontSize: 21, color: colors.text, letterSpacing: -0.3 },
  cardHint: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  label: {
    fontFamily: font.semibold, fontSize: 11, color: colors.textFaint, letterSpacing: 1,
    textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.xs,
  },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 52, borderWidth: 1.5,
    borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface,
  },
  fieldFocused: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  input: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.dangerSoft,
    padding: spacing.md, borderRadius: radius.md, marginTop: spacing.lg,
  },
  errorText: { flex: 1, fontFamily: font.medium, fontSize: 13, color: colors.danger },
  forgotLink: { fontFamily: font.semibold, fontSize: 13, color: colors.primary },
  footnote: { fontFamily: font.medium, fontSize: 12, color: colors.onDarkMuted, textAlign: 'center', marginTop: spacing.xl },
})
