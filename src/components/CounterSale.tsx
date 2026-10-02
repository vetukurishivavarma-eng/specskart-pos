import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Crypto from 'expo-crypto'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { api, apiError } from '../lib/api'
import { useActiveStore } from '../lib/activeStore'
import { useAuth } from '../lib/auth'
import { enqueueSale, isNetworkError } from '../lib/offlineQueue'
import { CartLine, FrameProduct, PosSaleView } from '../lib/pos'
import { LensOnBill, printSaleReceipt } from '../lib/receipt'
import { useScanCapture } from '../lib/scanCapture'
import { colors, font, formatKwacha, radius, spacing } from '../theme'
import { Badge, Button, Card, Field, Icon, ListRow, Loading, QtyStepper, SectionLabel, Select, StatRow, Toggle } from '../ui/components'

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE', label: 'Mobile' },
] as const
const LENS_TYPES = [
  { value: 'CLEAR', label: 'Clear' },
  { value: 'PHOTOCHROMATIC', label: 'Photochromatic' },
] as const
const ADD_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'BIFOCAL', label: 'Bifocal' },
  { value: 'PROGRESSIVE', label: 'Progressive' },
] as const

type Bill = { frame: PosSaleView | null; lens: { id: string; priceMinor: number | null; balanceMinor: number } | null; totalMinor: number }

/** The counter's one bill: frames from this shop's stock and/or a pair of lenses, one discount,
 *  one payment, one total. Backed by POST /admin/pos/combined-sales, which records both halves
 *  in one transaction -- the lens half can't fail and leave a frame sale behind. */
export default function CounterSale() {
  const router = useRouter()
  const store = useActiveStore((s) => s.store)
  const user = useAuth((s) => s.user)
  const qc = useQueryClient()

  // frames
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  // lenses
  const [withLens, setWithLens] = useState(false)
  const [lensType, setLensType] = useState<string>('CLEAR')
  const [blueBlock, setBlueBlock] = useState(false)
  const [structure, setStructure] = useState('')
  const [sphR, setSphR] = useState('')
  const [sphL, setSphL] = useState('')
  const [cylR, setCylR] = useState('')
  const [cylL, setCylL] = useState('')
  const [add, setAdd] = useState('')
  const [axisR, setAxisR] = useState('')
  const [axisL, setAxisL] = useState('')
  const [pd, setPd] = useState('')
  const [takesNow, setTakesNow] = useState(false) // fitted while they wait -- skips the lab queue
  const [payingNow, setPayingNow] = useState('')   // blank = the whole bill
  // the bill
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [discount, setDiscount] = useState('')
  const [method, setMethod] = useState<string>('CASH')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ bill: Bill | null; lens?: LensOnBill; takenNow?: boolean } | null>(null)

  useFocusEffect(useCallback(() => {
    const code = useScanCapture.getState().consume()
    if (code) setQuery(code)
  }, []))

  const { data: products, isLoading } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: async () => (await api.get('/admin/catalog/products')).data as FrameProduct[],
  })
  const results = useMemo(() => {
    const list = (products ?? []).filter((p) => p.status === 'ACTIVE')
    const q = query.trim().toLowerCase()
    if (!q) return list.slice(0, 6)
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q)
    ).slice(0, 20)
  }, [products, query])

  function addToCart(p: FrameProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id)
      if (existing) return prev.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      return [...prev, { product: p, quantity: 1 }]
    })
  }
  function setQty(productId: string, quantity: number) {
    setCart((prev) => (quantity <= 0
      ? prev.filter((l) => l.product.id !== productId)
      : prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l))))
  }

  const lensInputs = {
    lensType,
    blueBlock,
    sphRight: num(sphR),
    sphLeft: num(sphL),
    cylRight: num(cylR),
    cylLeft: num(cylL),
    addPower: structure ? num(add) : null,
    lensStructure: structure || null,
  }
  const quote = useQuery({
    queryKey: ['lens-walk-in-quote', lensInputs],
    queryFn: async () => (await api.post<{ priceMinor: number }>('/admin/lens-sales/walk-in/quote', lensInputs)).data.priceMinor,
    enabled: withLens && (!structure || num(add) !== null),
    retry: false,
  })
  const lensPrice = withLens ? quote.data : undefined

  const framesGross = cart.reduce((sum, l) => sum + l.product.priceMinor * l.quantity, 0)
  const gross = framesGross + (lensPrice ?? 0)
  const discountMinor = Math.max(0, Math.round((num(discount) ?? 0) * 100))
  const tooMuch = discountMinor > 0 && (!withLens || lensPrice !== undefined) && discountMinor > gross

  // One discount for the whole bill, split by value between the lenses and the frames. Without
  // a lens price (offline) the frames absorb what they can and the server checks the rest.
  const lensDiscount = !withLens ? 0
    : lensPrice === undefined ? Math.max(0, discountMinor - framesGross)
    : framesGross === 0 ? discountMinor
    : Math.round((discountMinor * lensPrice) / gross)
  const framesDiscount = Math.min(framesGross, discountMinor - lensDiscount)

  function lineDiscounts(): number[] {
    let left = framesDiscount
    return cart.map((l, i) => {
      const line = l.product.priceMinor * l.quantity
      const d = i === cart.length - 1 ? left : Math.min(left, Math.floor((framesDiscount * line) / framesGross))
      left -= d
      return d
    })
  }

  // A deposit is taken against the lenses only: frames are paid for at the counter.
  const billTotal = Math.max(0, gross - discountMinor)
  const framesNet = framesGross - framesDiscount
  const lensNet = lensPrice === undefined ? undefined : lensPrice - lensDiscount
  const payNowMinor = num(payingNow) === null ? null : Math.round((num(payingNow) ?? 0) * 100)
  const lensDeposit = !withLens || takesNow || payNowMinor === null ? null : payNowMinor - framesNet
  const depositProblem = lensDeposit === null ? null
    : lensDeposit < 0 ? `Pay at least ${formatKwacha(framesNet)} — the frames are paid in full today`
    : lensNet !== undefined && lensDeposit > lensNet ? "That's more than the bill"
    : null
  const balanceDue = lensDeposit !== null && lensNet !== undefined ? Math.max(0, lensNet - lensDeposit) : 0

  const hasSomething = cart.length > 0 || withLens
  const canCharge = hasSomething && !tooMuch && !depositProblem && (!withLens || (customerName.trim().length > 0 && (!structure || num(add) !== null)))

  async function charge() {
    if (!canCharge) return
    setBusy(true)
    setError(null)
    const ref = Crypto.randomUUID()
    const off = lineDiscounts()
    const body = {
      frame: cart.length > 0 && store ? {
        storeId: store.id,
        items: cart.map((l, i) => ({ productId: l.product.id, quantity: l.quantity, unitPriceMinor: null, discountMinor: off[i] || null })),
        payments: [{ method, amountMinor: framesGross - framesDiscount, reference: null }],
        customerName: customerName.trim() || null,
        customerPhone: phone.trim() || null,
        notes: '',
        clientReference: `${ref}-f`,
      } : null,
      lens: withLens ? {
        customerName: customerName.trim(),
        phone: phone.trim() || null,
        ...lensInputs,
        paymentMethod: method,
        soldBy: user?.name ?? user?.email,
        shopName: null,
        clientReference: `${ref}-l`,
        storeId: store?.id ?? null,
        discountMinor: lensDiscount || null,
        axisRight: int(axisR),
        axisLeft: int(axisL),
        pd: pd.trim() || null,
        depositMinor: lensDeposit,
        collectedNow: takesNow,
      } : null,
    }
    const lensLabel = [LENS_TYPES.find((t) => t.value === lensType)?.label, blueBlock && 'blue-block', structure.toLowerCase()].filter(Boolean).join(', ')
    try {
      const { data } = await api.post<Bill>('/admin/pos/combined-sales', body)
      setDone({
        bill: data,
        takenNow: takesNow,
        lens: data.lens ? { ref: `LENS-${data.lens.id.slice(0, 8).toUpperCase()}`, label: lensLabel, priceMinor: data.lens.priceMinor ?? 0, method, balanceMinor: data.lens.balanceMinor } : undefined,
      })
      if (store) qc.invalidateQueries({ queryKey: ['pos-inventory', store.id] })
      reset()
    } catch (e) {
      if (isNetworkError(e)) {
        // Replays automatically when back online; each half dedupes on its own reference.
        await enqueueSale('/admin/pos/combined-sales', body, ref)
        setDone({ bill: null })
        reset()
      } else {
        setError(apiError(e))
      }
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setCart([]); setQuery(''); setWithLens(false); setLensType('CLEAR'); setBlueBlock(false); setStructure('')
    setSphR(''); setSphL(''); setCylR(''); setCylL(''); setAdd('')
    setAxisR(''); setAxisL(''); setPd(''); setTakesNow(false); setPayingNow('')
    setCustomerName(''); setPhone(''); setDiscount(''); setMethod('CASH')
  }

  if (done) {
    const b = done.bill
    return (
      <Card style={{ marginTop: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
        <Badge label={b ? 'Sale complete' : 'Saved — will sync when back online'} tone={b ? 'success' : 'warning'} />
        {b && (
          <>
            <Text style={{ fontFamily: font.displayHeavy, fontSize: 34, color: colors.ink, letterSpacing: -1 }}>{formatKwacha(b.totalMinor)}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted }}>
              {[b.frame?.receiptNumber, done.lens?.ref].filter(Boolean).join(' · ')}
            </Text>
            {!!done.lens?.balanceMinor && (
              <Badge label={`Balance at pickup: ${formatKwacha(done.lens.balanceMinor)}`} tone="warning" />
            )}
            {done.lens && !done.takenNow && (
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                Lenses are on the Lens orders list. Mark them ready there and the customer gets a WhatsApp.
              </Text>
            )}
            <Button label="Print receipt" variant="secondary" icon="printer" onPress={() => printSaleReceipt(b.frame, store?.name ?? '', done.lens)} />
          </>
        )}
        <Button label="New sale" onPress={() => setDone(null)} size="lg" style={{ alignSelf: 'stretch' }} />
      </Card>
    )
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
      {/* ---- frames ---- */}
      <Card style={{ gap: spacing.md }}>
        <SectionLabel>Frames</SectionLabel>
        {!store ? (
          <Button label="Pick a shop to sell frames" variant="secondary" icon="home" onPress={() => router.push('/store-picker')} />
        ) : (
          <>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 48, borderWidth: 1,
              borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.canvas,
            }}>
              <Icon name="search" size={17} color={colors.textFaint} />
              <TextInput
                style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }}
                placeholder="Search frames or scan a barcode"
                placeholderTextColor={colors.textFaint}
                value={query}
                onChangeText={setQuery}
              />
              <Pressable onPress={() => router.push('/scan')} hitSlop={8}>
                <Icon name="camera" size={18} color={colors.primary} />
              </Pressable>
            </View>
            {isLoading ? <Loading /> : results.map((p) => (
              <ListRow
                key={p.id}
                title={p.name}
                subtitle={`${p.sku ?? 'No SKU'} · ${formatKwacha(p.priceMinor)} · ${p.stockQty} in stock`}
                trailing={<Button label="Add" size="md" variant="secondary" onPress={() => addToCart(p)} />}
              />
            ))}
            {!isLoading && results.length === 0 && (
              <Text style={{ fontFamily: font.regular, color: colors.textMuted }}>No matching frames</Text>
            )}
            {cart.map((line) => (
              <View key={line.product.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, color: colors.text }} numberOfLines={1}>{line.product.name}</Text>
                <QtyStepper value={line.quantity} onChange={(q) => setQty(line.product.id, q)} size="sm" min={0} />
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text, width: 84, textAlign: 'right' }}>
                  {formatKwacha(line.product.priceMinor * line.quantity)}
                </Text>
              </View>
            ))}
          </>
        )}
      </Card>

      {/* ---- lenses ---- */}
      <Card style={{ gap: spacing.md }}>
        <SectionLabel>Lenses</SectionLabel>
        <Toggle label="Add lenses to this bill" value={withLens} onChange={setWithLens} />
        {withLens && (
          <>
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
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Field label="Axis right" value={axisR} onChangeText={setAxisR} keyboardType="number-pad" placeholder="0–180" /></View>
              <View style={{ flex: 1 }}><Field label="Axis left" value={axisL} onChangeText={setAxisL} keyboardType="number-pad" placeholder="0–180" /></View>
              <View style={{ flex: 1 }}><Field label="PD" value={pd} onChangeText={setPd} keyboardType="numbers-and-punctuation" placeholder="62" /></View>
            </View>
            <Toggle label="Customer takes them now" hint="Fitted while they wait — skips the lab queue" value={takesNow} onChange={setTakesNow} />
            {lensPrice !== undefined && <StatRow label="Lens price" value={formatKwacha(lensPrice)} />}
            {quote.isError && <Text style={{ fontFamily: font.regular, color: colors.textMuted }}>{apiError(quote.error)}</Text>}
          </>
        )}
      </Card>

      {/* ---- the bill ---- */}
      {hasSomething && (
        <Card style={{ gap: spacing.md }}>
          <SectionLabel>Bill</SectionLabel>
          <Field label={withLens ? 'Customer name' : 'Customer name (optional)'} value={customerName} onChangeText={setCustomerName} placeholder={withLens ? 'Required for lenses' : undefined} />
          <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Discount (K, optional)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0" />
          <Select label="Payment method" value={method} options={PAYMENT_METHODS as any} onChange={setMethod} />
          {withLens && !takesNow && (
            <Field
              label="Paying now (K, optional)"
              hint="Leave blank for the full amount. Anything less is a deposit — the balance is taken at pickup."
              value={payingNow}
              onChangeText={setPayingNow}
              keyboardType="decimal-pad"
              placeholder={lensNet !== undefined ? (billTotal / 100).toFixed(2) : 'Full amount'}
            />
          )}

          <View style={{ gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
            {cart.length > 0 && <StatRow label="Frames" value={formatKwacha(framesGross)} />}
            {withLens && <StatRow label="Lenses" value={lensPrice !== undefined ? formatKwacha(lensPrice) : '—'} />}
            {discountMinor > 0 && <StatRow label="Discount" value={`- ${formatKwacha(discountMinor)}`} />}
            <StatRow label="Total" value={withLens && lensPrice === undefined ? '—' : formatKwacha(billTotal)} emphasis />
            {balanceDue > 0 && <StatRow label="Paying now" value={formatKwacha(payNowMinor ?? 0)} />}
            {balanceDue > 0 && <StatRow label="Balance at pickup" value={formatKwacha(balanceDue)} />}
          </View>
          {depositProblem && <Text style={{ color: colors.danger }}>{depositProblem}</Text>}
          {tooMuch && <Text style={{ color: colors.danger }}>Discount can't be more than the bill.</Text>}
          {error && <Text style={{ color: colors.danger }}>{error}</Text>}
          <Button
            label={busy ? 'Billing…' : withLens && lensPrice === undefined ? 'Charge' : `Charge ${formatKwacha(balanceDue > 0 ? payNowMinor ?? 0 : billTotal)}`}
            onPress={charge}
            disabled={!canCharge}
            loading={busy}
            size="lg"
          />
        </Card>
      )}
    </View>
  )
}

/** Whole number or null, for the axis. */
function int(v: string): number | null {
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? null : n
}

/** Blank -> null; accepts "-2.50", "+2", "2,50". */
function num(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isNaN(n) ? null : n
}
