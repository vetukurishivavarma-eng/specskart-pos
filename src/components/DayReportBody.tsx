import { useQuery } from '@tanstack/react-query'
import { Text, View } from 'react-native'
import { api } from '../lib/api'
import { DayReportView } from '../lib/pos'
import { colors, font, formatKwacha, spacing } from '../theme'
import { Card, EmptyState, Loading, RowDivider, StatRow, Subtitle } from '../ui/components'

export function DayReportBody({ storeId, date }: { storeId: string; date: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pos-day-report', storeId, date],
    queryFn: async () => (await api.get<DayReportView>('/admin/pos/reports/day', { params: { storeId, date } })).data,
  })

  if (isLoading || !data) return <Loading />

  return (
    <View style={{ gap: spacing.lg }}>
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
    </View>
  )
}
