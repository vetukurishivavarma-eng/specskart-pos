import * as LocalAuthentication from 'expo-local-authentication'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useScreenLock } from '../lib/screenLock'
import { colors, font, radius, spacing } from '../theme'
import { Icon } from './components'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

export function LockScreen() {
  const unlock = useScreenLock((s) => s.unlock)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    void tryBiometric()
  }, [])

  async function tryBiometric() {
    const supported = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!supported || !enrolled) return
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Specskart POS' })
    if (result.success) useScreenLock.setState({ locked: false })
  }

  async function press(key: string) {
    if (key === 'back') return setPin((p) => p.slice(0, -1))
    if (key === '') return
    const next = (pin + key).slice(0, 6)
    setPin(next)
    if (next.length >= 4) {
      const ok = await unlock(next)
      if (ok) return
      setError(true)
      setPin('')
      setTimeout(() => setError(false), 600)
    }
  }

  return (
    <View style={styles.root}>
      <Icon name="lock" size={32} color={colors.onDark} />
      <Text style={styles.title}>Enter PIN</Text>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled, error && styles.dotError]} />
        ))}
      </View>
      <View style={styles.pad}>
        {DIGITS.map((d, i) => (
          <Pressable key={i} style={styles.key} disabled={!d} onPress={() => press(d)}>
            {d === 'back' ? <Icon name="delete" size={22} color={colors.onDark} /> : <Text style={styles.keyText}>{d}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.primaryDeep, zIndex: 999,
    alignItems: 'center', justifyContent: 'center', gap: spacing.lg,
  },
  title: { fontFamily: font.bold, fontSize: 20, color: colors.onDark },
  dots: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.onDarkMuted },
  dotFilled: { backgroundColor: colors.onDark },
  dotError: { borderColor: colors.danger, backgroundColor: colors.danger },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'space-between', marginTop: spacing.lg },
  key: {
    width: 76, height: 76, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  keyText: { fontFamily: font.semibold, fontSize: 24, color: colors.onDark },
})
