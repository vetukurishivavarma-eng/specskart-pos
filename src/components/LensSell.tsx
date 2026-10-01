import { useQuery } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { api, apiError } from '../lib/api'
import { useActiveStore } from '../lib/activeStore'
import { useAuth } from '../lib/auth'
import { enqueueSale, isNetworkError } from '../lib/offlineQueue'
import { colors, formatKwacha, spacing } from '../theme'
import { Badge, Button, Card, Field, Select, StatRow, Toggle } from '../ui/components'

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
 *  add-on and the Rx powers the client's price list is banded on (SPH / CYL / Add). One pair of lens blanks comes off this shop's shelf (backend V45); with
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
  const [sphR, setSphR] = useState('')
  const [sphL, setSphL] = useState('')
  const [cylR, setCylR] = useState('')
  const [cylL, setCylL] = useState('')
  const [add, setAdd] = useState('')
  const [method, setMethod] = useState('')
  const [discount, setDiscount] = useState('') // kwacha off this sale
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queuedOffline, setQueuedOffline] = useState(false)

  const priceInputs = {
    lensType,
    blueBlock,
    sphRight: num(sphR),
    sphLeft: num(sphL),
    cylRight: num(cylR),
    cylLeft: num(cylL),
    addPower: structure ? num(add) : null,
    lensStructure: structure || null,
  }
  // Off-sheet Rx or offline -> no price shown; the backend still checks the discount on the sale.
  const quote = useQuery({
    queryKey: ['lens-walk-in-quote', priceInputs],
    queryFn: async () => (await api.post<{ priceMinor: number }>('/admin/lens-sales/walk-in/quote', priceInputs)).data.priceMinor,
    enabled: !structure || num(add) !== null,
    retry: false,
  })
  const price = quote.data
  const discountMinor = Math.max(0, Math.round((num(discount) ?? 0) * 100))
  const tooMuch = price !== undefined && discountMinor > price

  const canSubmit = customerName.trim().length > 0 && method && (!structure || num(add)) && !tooMuch

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    const body = {
      customerName: customerName.trim(),
      phone: phone.trim() || null,
      ...priceInputs,
      discountMinor: discountMinor || null,
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
    setSphR('')
    setSphL('')
    setCylR('')
    setCylL('')
    setAdd('')
    setMethod('')
    setDiscount('')
  }

  return (
    <Card style={{ marginTop: spacing.lg, gap: spacing.md }}>
      {queuedOffline && <Badge label="Last sale saved — will sync when back online" tone="warning" />}
      <Field label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Required" />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Select label="Lens type" value={lensType} options={LENS_TYPES as any} onChange={setLensType} />
      <Toggle label="Blue-light block" value={blueBlock} onChange={setBlueBlock} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}><Field label="SPH right" value={sphR} onChangeText={setSphR} keyboardType="numbers-and-punctuation" placeholder="-2.50" /></View>
        <View style={{ flex: 1 }}><Field label="SPH left" value={sphL} onChangeText={setSphL} keyboardType="numbers-and-punctuation" placeholder="-2.50" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}><Field label="CYL right" value={cylR} onChangeText={setCylR} keyboardType="numbers-and-punctuation" placeholder="-0.75" /></View>
        <View style={{ flex: 1 }}><Field label="CYL left" value={cylL} onChangeText={setCylL} keyboardType="numbers-and-punctuation" placeholder="-0.75" /></View>
      </View>
      <Select label="Add-on" value={structure} options={ADD_OPTIONS as any} onChange={setStructure} />
      {!!structure && <Field label="Add power" value={add} onChangeText={setAdd} keyboardType="decimal-pad" placeholder="+2.00" />}
      <Field label="Discount (K, optional)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0" />
      {price !== undefined && discountMinor > 0 && <StatRow label="Before discount" value={formatKwacha(price)} />}
      {price !== undefined && discountMinor > 0 && <StatRow label="Discount" value={`- ${formatKwacha(discountMinor)}`} />}
      {price !== undefined && <StatRow label="Total" value={formatKwacha(Math.max(0, price - discountMinor))} emphasis />}
      {tooMuch && <Text style={{ color: colors.danger }}>Discount can't be more than the lens price.</Text>}
      {quote.isError && <Text style={{ color: colors.textMuted }}>{apiError(quote.error)}</Text>}
      <Select label="Payment method" value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button label={busy ? 'Billing…' : 'Complete sale'} onPress={submit} disabled={!canSubmit} loading={busy} size="lg" />
    </Card>
  )
}

/** Blank -> null; accepts "-2.50", "+2", "2,50". */
function num(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isNaN(n) ? null : n
}
