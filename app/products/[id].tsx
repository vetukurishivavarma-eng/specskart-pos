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

  const { data: product, isLoading } = useQuery({
    queryKey: ['catalog-product', id],
    queryFn: async () => (await api.get<AdminProduct>(`/admin/catalog/products/${id}`)).data,
  })

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

  if (isLoading || !product) return <Loading />

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await api.put(`/admin/catalog/products/${id}`, {
        name: product!.name,
        description: product!.description,
        frameCategoryCode: product!.frameCategoryCode,
        material: product!.material,
        colour: product!.colour,
        compareAtMinor: product!.compareAtMinor,
        dropsAt: product!.dropsAt,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        priceMinor: Math.round(Number(price) * 100),
        costPriceMinor: Math.round(Number(cost) * 100),
        stockQty: Number(stockQty),
        status,
      })
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
      <Title>{product.name}</Title>
      <Badge label={product.status} tone={product.status === 'ACTIVE' ? 'success' : 'neutral'} />

      <Field label="SKU" value={sku} onChangeText={setSku} autoCapitalize="characters" />
      <Field label="Barcode" value={barcode} onChangeText={setBarcode} />
      <Field label="Price (K)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <Field label="Cost price (K)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
      <Field label="Stock quantity" value={stockQty} onChangeText={setStockQty} keyboardType="number-pad" />
      <Select label="Status" value={status} options={STATUSES as any} onChange={setStatus} />

      {error && <Text style={{ fontFamily: font.medium, color: colors.danger }}>{error}</Text>}
      <Button label={busy ? 'Saving…' : 'Save'} onPress={save} loading={busy} size="lg" />
    </ScrollView>
  )
}
