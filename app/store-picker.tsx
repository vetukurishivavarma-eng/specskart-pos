import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { FlatList } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { spacing } from '../src/theme'
import { EmptyState, ListRow, Loading, RowDivider } from '../src/ui/components'

export default function StorePicker() {
  const router = useRouter()
  const select = useActiveStore((s) => s.select)
  const { data, isLoading } = useQuery({
    queryKey: ['pos-stores'],
    queryFn: async () => (await api.get('/admin/pos/stores')).data as
      { id: string; name: string; code: string; city: string; active: boolean }[],
  })

  if (isLoading) return <Loading />
  if (!data?.length) {
    return <EmptyState icon="home" title="No shops set up yet" hint="Ask an administrator to add one." />
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data.filter((s) => s.active)}
      keyExtractor={(s) => s.id}
      ItemSeparatorComponent={RowDivider}
      renderItem={({ item }) => (
        <ListRow
          icon="home"
          title={item.name}
          subtitle={`${item.code}${item.city ? ` · ${item.city}` : ''}`}
          onPress={async () => {
            await select(item)
            router.replace('/')
          }}
        />
      )}
    />
  )
}
