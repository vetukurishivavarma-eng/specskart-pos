import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, RefreshControl, TextInput, View } from 'react-native'
import { api } from '../../src/lib/api'
import { FrameProduct } from '../../src/lib/pos'
import { colors, font, formatKwacha, radius, spacing } from '../../src/theme'
import { Button, EmptyState, ListRow, Loading, RowDivider, Title } from '../../src/ui/components'
import LensPricing from '../pricing'

// Client (2026-10-23): frames, lenses and accessories on one page, a button for each.
// Lens types are fixed, so the Lenses tab is the lens price list itself, not a product list.
const TABS = [
  { kind: 'FRAME', label: 'Frames' },
  { kind: 'LENS', label: 'Lenses' },
  { kind: 'ACCESSORY', label: 'Accessories' },
] as const
type Kind = (typeof TABS)[number]['kind']

export default function Products() {
  const router = useRouter()
  const [tab, setTab] = useState<Kind>('FRAME')
  const [query, setQuery] = useState('')

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: async () => (await api.get<FrameProduct[]>('/admin/catalog/products')).data,
  })

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? [])
      .filter((p) => (p.kind ?? 'FRAME') === tab)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q))
  }, [data, query, tab])

  const accessory = tab === 'ACCESSORY'

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        {TABS.map((t) => (
          <Button key={t.kind} label={t.label} variant={tab === t.kind ? 'primary' : 'secondary'}
            onPress={() => setTab(t.kind)} style={{ flex: 1, paddingHorizontal: 4 }} />
        ))}
      </View>

      {tab === 'LENS' ? <LensPricing /> : isLoading ? <Loading /> : (
        <FlatList
          contentContainerStyle={{ padding: spacing.lg }}
          data={results}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ItemSeparatorComponent={RowDivider}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.md }}>
              <Title style={{ marginBottom: spacing.md }}>{accessory ? 'Accessories' : 'Frames'}</Title>
              <Button
                label={accessory ? 'Add an accessory' : 'Add a frame'}
                icon="plus"
                onPress={() => router.push(accessory ? '/products/new?kind=ACCESSORY' : '/products/new')}
                style={{ marginBottom: spacing.md }}
              />
              <View style={{
                flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1.5,
                borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.canvas,
              }}>
                <TextInput
                  style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }}
                  placeholder="Search by name, SKU, or barcode"
                  placeholderTextColor={colors.textFaint}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <EmptyState icon={query ? 'search' : 'package'} title={query ? 'No matching products'
              : accessory ? 'No accessories yet' : 'No frames yet'}
              hint={accessory && !query ? 'Cleaning solution, pouches, cases, chains…' : undefined} />
          }
          renderItem={({ item }) => (
            <ListRow
              title={item.name}
              subtitle={`${item.sku ?? 'No SKU'} · ${formatKwacha(item.priceMinor)} · ${item.stockQty} in stock`}
              onPress={() => router.push(`/products/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  )
}
