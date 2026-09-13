import { useQuery } from '@tanstack/react-query'
import { ScrollView, Text, View } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { DayReportView } from '../src/lib/pos'
import { colors, font, formatKwacha, spacing } from '../src/theme'
import { Card, EmptyState, Loading, RowDivider, StatRow, Subtitle, Title } from '../src/ui/components'

export default function DayReport() {
  const store = useActiveStore((s) => s.store)
  const today = new Date().toISOString().slice(0, 10)

  const { data, isLoading } = useQuery({
    queryKey: ['pos-day-report', store?.id, today],
    queryFn: async () => (await api.get<DayReportView>('/admin/pos/reports/day', { params: { storeId: store!.id, date: today } })).data,
    enabled: !!store,
  })

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />
  if (isLoading || !data) return <Loading />

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View>
        <Title>Day report — {store.name}</Title>
        <Subtitle>{data.reportDate}</Subtitle>
      </View>

      <Card style={{ gap: 2 }}>
        <Subtitle style={{ marginTop: 0 }}>Gross takings (frame sales)</Subtitle>
        <Text style={{ fontFamily: font.extrabold, fontSize: 32, color: colors.text }}>{formatKwacha(data.grossTotalMinor)}</Text>
        <Subtitle>{data.saleCount} sale(s)</Subtitle>
      </Card>

      <Card style={{ gap: spacing.xs }}>
        <StatRow label="Cash" value={formatKwacha(data.cashTotalMinor)} />
        <StatRow label="Card" value={formatKwacha(data.cardTotalMinor)} />
        <StatRow label="Mobile money" value={formatKwacha(data.mobileTotalMinor)} />
      </Card>

      <View>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text, marginBottom: spacing.sm }}>Best sellers</Text>
        {data.topItems.length === 0 ? (
          <EmptyState icon="bar-chart-2" title="No sales yet today" />
        ) : (
          <Card padded={false}>
            {data.topItems.map((item, i) => (
              <View key={item.name}>
                <StatRow label={`${item.name} × ${item.quantity}`} value={formatKwacha(item.totalMinor)} />
                {i < data.topItems.length - 1 && <RowDivider />}
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  )
}
