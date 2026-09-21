import * as Crypto from 'expo-crypto'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text } from 'react-native'
import { api, apiError } from '../lib/api'
import { useActiveStore } from '../lib/activeStore'
import { useAuth } from '../lib/auth'
import { enqueueSale, isNetworkError } from '../lib/offlineQueue'
import { colors, spacing } from '../theme'
import { Badge, Button, Card, Field, Select, Toggle } from '../ui/components'

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
 *  add-on directly. One pair of lens blanks comes off this shop's shelf (backend V45); with
 *  none left the sale still goes through, flagged as a backorder. */
export default function LensSell() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const store = useActiveStore((s) => s.store)

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [lensType, setLensType] = useState<string>('CLEAR')
  const [blueBlock, setBlueBlock] = useState(false)
  const [structure, setStructure] = useState('')
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queuedOffline, setQueuedOffline] = useState(false)

  const canSubmit = customerName.trim().length > 0 && method

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    const body = {
      customerName: customerName.trim(),
      phone: phone.trim() || null,
      lensType,
      blueBlock,
      addPower: structure ? 1 : null, // ponytail: counter sale just picks bifocal/progressive, not the exact Add power
      lensStructure: structure || null,
      paymentMethod: method,
      soldBy: user?.name ?? user?.email,
      shopName: null,
      clientReference: Crypto.randomUUID(),
      storeId: store?.id ?? null,
    }
    try {
      await api.post('/admin/lens-sales/walk-in', body)
      reset()
      router.push('/reports')
    } catch (e) {
      if (isNetworkError(e)) {
        // Same clientReference is sent on replay -- the backend now dedupes on it
        // (LensInquiryService.walkInSale), so a retry can't double-sell.
        await enqueueSale('/admin/lens-sales/walk-in', body, body.clientReference)
        reset()
        setQueuedOffline(true)
      } else {
        setError(apiError(e))
      }
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setCustomerName('')
    setPhone('')
    setLensType('CLEAR')
    setBlueBlock(false)
    setStructure('')
    setMethod('')
  }

  return (
    <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
      {queuedOffline && <Badge label="Last sale saved — will sync when back online" tone="warning" />}
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
