import { useState } from 'react'
import { Text, View } from 'react-native'
import { useScreenLock } from '../src/lib/screenLock'
import { colors, font, spacing } from '../src/theme'
import { Button, Card, Field, Subtitle, Title } from '../src/ui/components'

export default function ScreenLockSettings() {
  const { configured, configure, disable } = useScreenLock()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (pin.length < 4) return setError('PIN must be at least 4 digits.')
    if (pin !== confirm) return setError("PINs don't match.")
    setError(null)
    await configure(pin)
    setPin('')
    setConfirm('')
  }

  return (
    <View style={{ padding: spacing.lg, gap: spacing.lg }}>
      <View>
        <Title>Screen lock</Title>
        <Subtitle>Locks the app after 2 minutes in the background — a fingerprint or the PIN unlocks it.</Subtitle>
      </View>

      {configured ? (
        <Card style={{ gap: spacing.md }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.success }}>Screen lock is on</Text>
          <Button label="Turn off screen lock" variant="danger" onPress={() => disable()} />
        </Card>
      ) : (
        <Card style={{ gap: spacing.md }}>
          <Field label="New PIN" value={pin} onChangeText={setPin} secureTextEntry keyboardType="number-pad" />
          <Field label="Confirm PIN" value={confirm} onChangeText={setConfirm} secureTextEntry keyboardType="number-pad" />
          {error && <Text style={{ fontFamily: font.medium, color: colors.danger }}>{error}</Text>}
          <Button label="Turn on screen lock" onPress={save} disabled={!pin || !confirm} />
        </Card>
      )}
    </View>
  )
}
