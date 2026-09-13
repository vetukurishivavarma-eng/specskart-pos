import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, TextInput, View } from 'react-native'
import { api } from '../../src/lib/api'
import { FrameProduct } from '../../src/lib/pos'
import { colors, font, formatKwacha, radius, spacing } from '../../src/theme'
import { EmptyState, ListRow, Loading, RowDivider, Title } from '../../src/ui/components'

export default function Products() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: async () => (await api.get<FrameProduct[]>('/admin/catalog/products')).data,
  })

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data ?? []
    return (data ?? []).filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.includes(q))
  }, [data, query])

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={results}
      keyExtractor={(p) => p.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Title style={{ marginBottom: spacing.md }}>Products</Title>
          <View style={{
            flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1.5,
            borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.canvas,
          }}>
            <TextInput
              style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text }}
              placeholder="Search by name, SKU, or barcode"
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="search" title="No matching products" />}
      renderItem={({ item }) => (
        <ListRow
          title={item.name}
          subtitle={`${item.sku ?? 'No SKU'} · ${formatKwacha(item.priceMinor)} · ${item.stockQty} in stock`}
          onPress={() => router.push(`/products/${item.id}`)}
        />
      )}
    />
  )
}
