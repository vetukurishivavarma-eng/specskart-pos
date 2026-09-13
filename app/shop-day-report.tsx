import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { api } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { DayReportBody } from '../src/components/DayReportBody'
import { StoreView } from '../src/lib/pos'
import { spacing } from '../src/theme'
import { EmptyState, Loading, SectionLabel, Select } from '../src/ui/components'

/** The Z-report for any shop, for an admin not standing at that till -- the till's own
 *  Day Report only ever shows the shop currently selected on the Sell tab. */
export default function ShopDayReport() {
  const user = useAuth((s) => s.user)
  const [storeId, setStoreId] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const { data: shops, isLoading } = useQuery({
    queryKey: ['pos-stores'],
    queryFn: async () => (await api.get<StoreView[]>('/admin/pos/stores')).data,
    enabled: user?.role === 'ADMIN',
  })

  if (user?.role !== 'ADMIN') {
    return <EmptyState icon="lock" title="Admin-only" hint="Your own shop's report is under More → Day report." />
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View>
        <SectionLabel>Shop</SectionLabel>
        {isLoading ? (
          <Loading />
        ) : (
          <Select
            value={storeId}
            onChange={setStoreId}
            options={[{ value: '', label: 'Choose a shop' }, ...(shops ?? []).map((s) => ({ value: s.id, label: s.name }))]}
          />
        )}
      </View>

      {storeId ? (
        <DayReportBody storeId={storeId} date={today} />
      ) : (
        <EmptyState icon="bar-chart-2" title="Pick a shop" hint="Its full day report appears here, same as the printed Z-report." />
      )}
    </ScrollView>
  )
}
