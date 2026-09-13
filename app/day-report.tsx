import { ScrollView, View } from 'react-native'
import { DayReportBody } from '../src/components/DayReportBody'
import { useActiveStore } from '../src/lib/activeStore'
import { spacing } from '../src/theme'
import { EmptyState, Subtitle, Title } from '../src/ui/components'

export default function DayReport() {
  const store = useActiveStore((s) => s.store)
  const today = new Date().toISOString().slice(0, 10)

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View>
        <Title>Day report — {store.name}</Title>
        <Subtitle>{today}</Subtitle>
      </View>
      <DayReportBody storeId={store.id} date={today} />
    </ScrollView>
  )
}
