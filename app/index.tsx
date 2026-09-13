import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { money } from '../src/lib/lens'

export default function Home() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const today = new Date().toISOString().slice(0, 10)
  const summary = useQuery({
    queryKey: ['lens-sales-summary', today],
    queryFn: async () => (await api.get('/admin/lens-sales/summary', { params: { date: today } })).data,
  })
  const pending = useQuery({
    queryKey: ['lens-sales-pending'],
    queryFn: async () => (await api.get('/admin/lens-sales/pending')).data,
    refetchInterval: 30_000,
  })

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Hi {user?.name ?? user?.email}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Today's sales</Text>
        <Text style={styles.summaryValue}>
          {summary.data ? money(summary.data.totalMinor, summary.data.currency) : '—'}
        </Text>
        <Text style={styles.summarySub}>{summary.data?.count ?? 0} sale(s)</Text>
      </View>

      <View style={styles.grid}>
        <Tile title="New sale" subtitle="Bill a walk-in customer" onPress={() => router.push('/new-sale')} />
        <Tile
          title="Web orders"
          subtitle={`${pending.data?.length ?? 0} waiting for pickup`}
          onPress={() => router.push('/pending')}
          badge={pending.data?.length}
        />
        <Tile title="Lens pricing" subtitle="Edit prices & stock" onPress={() => router.push('/pricing')} />
        <Tile title="Today's sales" subtitle="Full list" onPress={() => router.push('/sales')} />
      </View>

      <Pressable style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

function Tile({ title, subtitle, onPress, badge }: { title: string; subtitle: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable style={styles.tile} onPress={onPress}>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  greeting: { fontSize: 20, fontWeight: '600' },
  summaryCard: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20 },
  summaryLabel: { color: '#bbb', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  summarySub: { color: '#bbb', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '47%', backgroundColor: '#f4f4f4', borderRadius: 14, padding: 16,
    minHeight: 90, justifyContent: 'center',
  },
  tileTitle: { fontSize: 16, fontWeight: '600' },
  tileSubtitle: { color: '#666', marginTop: 4, fontSize: 13 },
  badge: {
    position: 'absolute', top: 10, right: 10, backgroundColor: '#c0392b',
    borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  logout: { alignItems: 'center', padding: 12 },
  logoutText: { color: '#c0392b' },
})
