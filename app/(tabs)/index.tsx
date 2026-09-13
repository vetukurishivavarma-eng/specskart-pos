import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, apiError } from '../../src/lib/api'
import { useAuth } from '../../src/lib/auth'
import { colors, spacing } from '../../src/theme'
import { Button, Card, Field, Select, Title, Toggle } from '../../src/ui/components'

const LENS_TYPES = [
  { value: 'CLEAR', label: 'Clear' },
  { value: 'PHOTOCHROMATIC', label: 'Photochromatic' },
] as const
const ADD_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'BIFOCAL', label: 'Bifocal' },
  { value: 'PROGRESSIVE', label: 'Progressive' },
] as const
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile' },
] as const

export default function Sell() {
  const router = useRouter()
  const user = useAuth((s) => s.user)

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [lensType, setLensType] = useState<string>('CLEAR')
  const [blueBlock, setBlueBlock] = useState(false)
  const [structure, setStructure] = useState('')
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = customerName.trim().length > 0 && method

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/admin/lens-sales/walk-in', {
        customerName: customerName.trim(),
        phone: phone.trim() || null,
        lensType,
        blueBlock,
        addPower: structure ? 1 : null, // ponytail: counter sale just picks bifocal/progressive, not the exact Add power
        lensStructure: structure || null,
        paymentMethod: method,
        soldBy: user?.name ?? user?.email,
        shopName: null,
      })
      setCustomerName('')
      setPhone('')
      setLensType('CLEAR')
      setBlueBlock(false)
      setStructure('')
      setMethod('')
      router.push('/reports')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title>New sale</Title>
      <Text style={styles.subtitle}>Bill a walk-in customer at the counter</Text>

      <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <Field label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Required" />
        <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Select label="Lens type" value={lensType} options={LENS_TYPES as any} onChange={setLensType} />
        <Toggle label="Blue-light block" value={blueBlock} onChange={setBlueBlock} />
        <Select label="Add-on" value={structure} options={ADD_OPTIONS as any} onChange={setStructure} />
        <Select label="Payment method" value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />

        {error && <Text style={styles.error}>{error}</Text>}
        <Button label={busy ? 'Billing…' : 'Complete sale'} onPress={submit} disabled={!canSubmit} loading={busy} size="lg" />
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  error: { color: colors.danger },
})
