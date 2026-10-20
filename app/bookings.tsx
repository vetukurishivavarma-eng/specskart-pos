import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Alert, RefreshControl, SectionList, Text, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { colors, font, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, ListRow, Loading, SectionLabel, Title } from '../src/ui/components'

type Visit = {
  leadId: string
  name: string | null
  waId: string
  visitOn: string // yyyy-mm-dd, Lusaka
  visitedOn: string | null
  state: 'TODAY' | 'UPCOMING' | 'MISSED' | 'DONE'
}

const GROUPS: { state: Visit['state']; title: string }[] = [
  { state: 'TODAY', title: 'Today' },
  { state: 'UPCOMING', title: 'Coming up' },
  { state: 'MISSED', title: "Didn't come" },
  { state: 'DONE', title: 'Check-up done' },
]
const BADGE: Record<Visit['state'], { label: string; tone: 'accent' | 'info' | 'warning' | 'success' }> = {
  TODAY: { label: 'Today', tone: 'accent' },
  UPCOMING: { label: 'Booked', tone: 'info' },
  MISSED: { label: 'Missed', tone: 'warning' },
  DONE: { label: 'Done', tone: 'success' },
}

function day(iso: string) {
  // the date as the customer picked it -- no timezone shift
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Free eye tests booked from WhatsApp. Every "eye test booked" push and the 8:00 list land here.
 * "Check-up done" stops the "still coming?" and "sorry we missed you" messages for that customer.
 */
export default function Bookings() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => (await api.get<{ today: string; visits: Visit[] }>('/admin/visits')).data,
  })
  const [busy, setBusy] = useState<string | null>(null)

  async function mark(v: Visit, action: 'done' | 'undo') {
    setBusy(v.leadId)
    try {
      await api.post(`/admin/visits/${v.leadId}/${action}`)
      await qc.invalidateQueries({ queryKey: ['visits'] })
    } catch (e) {
      Alert.alert('Could not save', apiError(e))
    } finally {
      setBusy(null)
    }
  }

  if (isLoading) return <Loading />
  const visits = data?.visits ?? []
  const sections = GROUPS.map((g) => ({ ...g, data: visits.filter((v) => v.state === g.state) })).filter((s) => s.data.length)

  return (
    <SectionList
      contentContainerStyle={{ padding: spacing.lg }}
      sections={sections}
      keyExtractor={(v) => v.leadId}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
          <Title>Eye test bookings</Title>
          <Text style={{ fontFamily: font.medium, color: colors.textMuted }}>
            Booked by customers in WhatsApp. Tap "Check-up done" once they've been in, so they don't get the
            "still coming?" or "we missed you" message.
          </Text>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="calendar" title="No bookings yet" hint="Customers book from the WhatsApp menu: Book a free eye test." />}
      renderSectionHeader={({ section }) => (
        <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
          <SectionLabel>{`${section.title} (${section.data.length})`}</SectionLabel>
        </View>
      )}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: spacing.sm, gap: spacing.sm }}>
          <ListRow
            icon="eye"
            title={item.name || `+${item.waId}`}
            subtitle={`${day(item.visitOn)} · +${item.waId}${item.visitedOn ? ` · came ${day(item.visitedOn)}` : ''}`}
            trailing={<Badge label={BADGE[item.state].label} tone={BADGE[item.state].tone} />}
            onPress={() => router.push({ pathname: '/chat/[waId]', params: { waId: item.waId } })}
          />
          {item.state === 'DONE' ? (
            <Button label="Undo" variant="ghost" icon="rotate-ccw" loading={busy === item.leadId} onPress={() => mark(item, 'undo')} />
          ) : (
            <Button label="Check-up done" icon="check" loading={busy === item.leadId} onPress={() => mark(item, 'done')} />
          )}
        </Card>
      )}
    />
  )
}
