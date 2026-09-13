import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text } from 'react-native'
import { api, apiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { colors, spacing } from '../theme'
import { Button, Card, Field, Select, Toggle } from '../ui/components'

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

/** Counter sale for the lens funnel — no WhatsApp step, staff enter lens type/blue-block/
 *  add-on directly. Lenses have no stock concept (made to order), so this bypasses the
 *  per-store inventory pipeline FrameSell uses. */
export default function LensSell() {
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
    <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
      <Field label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Required" />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Select label="Lens type" value={lensType} options={LENS_TYPES as any} onChange={setLensType} />
      <Toggle label="Blue-light block" value={blueBlock} onChange={setBlueBlock} />
      <Select label="Add-on" value={structure} options={ADD_OPTIONS as any} onChange={setStructure} />
      <Select label="Payment method" value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button label={busy ? 'Billing…' : 'Complete sale'} onPress={submit} disabled={!canSubmit} loading={busy} size="lg" />
    </Card>
  )
}
