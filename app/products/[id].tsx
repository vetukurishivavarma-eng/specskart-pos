import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { api, apiError } from '../../src/lib/api'
import { colors, font, spacing } from '../../src/theme'
import { Badge, Button, Field, Loading, Select, Title } from '../../src/ui/components'

// Mirrors com.specskart.catalog.CatalogDtos.AdminProduct. The backend's update endpoint
// overwrites description/frameCategoryCode/material/colour/compareAtMinor/dropsAt
// unconditionally (see AdminCatalogService.applyProduct), so a partial save from this
// screen must echo them back unchanged -- otherwise editing a price on the till would
// silently wipe fields only the web admin sets (category, compare-at price, drop date).
type AdminProduct = {
  id: string
  slug: string
  name: string
  description: string | null
  frameCategoryCode: string | null
  material: string | null
  colour: string | null
  compareAtMinor: number | null
  dropsAt: string | null
  sku: string | null
  barcode: string | null
  priceMinor: number
  costPriceMinor: number
  stockQty: number
  status: string
}

const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  // `/products/new` falls through the same [id] route -- one form, two verbs, rather than a
  // second screen that would drift out of step with this one every time a field is added.
  const creating = id === 'new'

  const { data: product, isLoading } = useQuery({
    queryKey: ['catalog-product', id],
    queryFn: async () => (await api.get<AdminProduct>(`/admin/catalog/products/${id}`)).data,
    enabled: !creating,
  })

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the form once the product loads -- can't set initial useState from a query result.
  useEffect(() => {
    if (!product) return
    setSku(product.sku ?? '')
    setBarcode(product.barcode ?? '')
    setPrice((product.priceMinor / 100).toFixed(2))
    setCost((product.costPriceMinor / 100).toFixed(2))
    setStockQty(String(product.stockQty))
    setStatus(product.status)
  }, [product])

  if (!creating && (isLoading || !product)) return <Loading />

  async function save() {
    if (creating && !name.trim()) {
      setError('Give the frame a name.')
      return
    }
    setBusy(true)
    setError(null)
    // The fields this screen doesn't show are echoed back untouched on an edit (see the note
    // on AdminProduct); on a create there is nothing to preserve, and the backend derives the
    // slug from the name.
    const body = {
      name: creating ? name.trim() : product!.name,
      description: creating ? null : product!.description,
      frameCategoryCode: creating ? null : product!.frameCategoryCode,
      material: creating ? null : product!.material,
      colour: creating ? null : product!.colour,
      compareAtMinor: creating ? null : product!.compareAtMinor,
      dropsAt: creating ? null : product!.dropsAt,
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      priceMinor: Math.round(Number(price || 0) * 100),
      costPriceMinor: Math.round(Number(cost || 0) * 100),
      stockQty: Number(stockQty || 0),
      status,
    }
    try {
      if (creating) await api.post('/admin/catalog/products', body)
      else await api.put(`/admin/catalog/products/${id}`, body)
      qc.invalidateQueries({ queryKey: ['catalog-product', id] })
      qc.invalidateQueries({ queryKey: ['catalog-products'] })
      router.back()
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Title>{creating ? 'New frame' : product!.name}</Title>
      {creating ? (
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Aviator Classic Gold" />
      ) : (
        <Badge label={product!.status} tone={product!.status === 'ACTIVE' ? 'success' : 'neutral'} />
      )}

      <Field label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
      <Field label="Barcode" value={barcode} onChangeText={setBarcode} />
      <Field label="Price (K)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <Field label="Cost price (K)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
      <Field label="Stock quantity" value={stockQty} onChangeText={setStockQty} keyboardType="number-pad" />
      {/* Once a shop carries a map pin, the website's count IS that shop's shelf and the
          backend ignores this field -- see AdminCatalogService.applyProduct. Say so rather
          than let someone type a number that quietly does nothing. */}
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.textFaint }}>
        Stock is counted on the shop&apos;s shelf. Record a delivery or a stock adjustment to change it.
      </Text>
      <Select label="Status" value={status} options={STATUSES as any} onChange={setStatus} />

      {error && <Text style={{ fontFamily: font.medium, color: colors.danger }}>{error}</Text>}
      <Button label={busy ? 'Saving…' : creating ? 'Add frame' : 'Save'} onPress={save} loading={busy} size="lg" />
    </ScrollView>
  )
}
