import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, Linking, Text, TextInput, View } from 'react-native'
import { api } from '../src/lib/api'
import { colors, font, radius, spacing } from '../src/theme'
import { Badge, Card, EmptyState, ListRow, Loading, Select, Title } from '../src/ui/components'

// Mirrors the backend's AcquisitionSource enum. Filtering is server-side, so the count
// shown is the real total for that source, not just what has been scrolled into view.
const SOURCES = [
  { value: '', label: 'All' },
  { value: 'META', label: 'Facebook / IG' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'UNKNOWN', label: 'Unknown' },
] as const
const SOURCE_LABEL: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.value, s.label]))

type Lead = {
  id: string
  name: string | null
  whatsappNumber: string
  source: string
  campaignName: string | null
  status: string
  createdAt: string
}
type Page = { content: Lead[]; page: number; totalPages: number; totalElements: number }

const PAGE_SIZE = 50

export default function Leads() {
  const [source, setSource] = useState<string>('')
  const [query, setQuery] = useState('')
  const q = query.trim()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['leads', source, q],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (await api.get<Page>('/admin/leads', {
        params: { page: pageParam, size: PAGE_SIZE, source: source || undefined, q: q || undefined },
      })).data,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })

  const rows = data?.pages.flatMap((p) => p.content) ?? []
  const total = data?.pages[0]?.totalElements ?? 0

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={rows}
      keyExtractor={(l) => l.id}
      onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
          <Title>Leads</Title>
          <Select value={source} options={SOURCES as any} onChange={setSource} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or number"
            placeholderTextColor={colors.textFaint}
            style={{
              height: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
              paddingHorizontal: spacing.md, fontFamily: font.medium, fontSize: 15, color: colors.text,
              backgroundColor: colors.canvas,
            }}
          />
          {!isLoading && <Text style={{ fontFamily: font.medium, color: colors.textMuted }}>{total} lead(s)</Text>}
        </View>
      }
      ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="users" title="No leads" hint="Try a different source or search." />}
      ListFooterComponent={isFetchingNextPage ? <Loading /> : null}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm }}>
          <ListRow
            icon="user"
            title={item.name || 'Unknown'}
            subtitle={`+${item.whatsappNumber.replace(/\D/g, '')} · ${new Date(item.createdAt).toLocaleDateString()}${item.campaignName ? ` · ${item.campaignName}` : ''}`}
            trailing={<Badge label={SOURCE_LABEL[item.source] ?? item.source} tone="accent" />}
            // The number is a verified WhatsApp one, so that is where staff will want to reach them.
            onPress={() => Linking.openURL(`https://wa.me/${item.whatsappNumber.replace(/\D/g, '')}`)}
          />
        </Card>
      )}
    />
  )
}
