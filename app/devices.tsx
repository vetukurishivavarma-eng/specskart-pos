import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, FlatList, Text, View } from 'react-native'
import { api } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { DeviceView, SignedInDevice, StaffMember } from '../src/lib/pos'
import { colors, font, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Subtitle } from '../src/ui/components'

export default function Devices() {
  const admin = useAuth((s) => s.user?.role === 'ADMIN')
  return admin ? <AllLogins /> : <MyDevices />
}

/** Admin: one card per login (only one phone may hold a login at a time), showing which phone
 *  holds it, so any "already signed in on another device" is freed in one tap. */
function AllLogins() {
  const qc = useQueryClient()
  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get<StaffMember[]>('/admin/users', { params: { includeInactive: true } })).data,
  })
  const devices = useQuery({
    queryKey: ['pos-devices-all'],
    queryFn: async () => (await api.get<SignedInDevice[]>('/admin/pos/devices')).data,
  })
  if (staff.isLoading || devices.isLoading) return <Loading />

  // every login, plus any device whose account isn't in the staff list (shouldn't happen, but never hide a session)
  const held = new Map<string, SignedInDevice[]>()
  for (const d of devices.data ?? []) held.set(d.userId, [...(held.get(d.userId) ?? []), d])
  const logins = [
    ...(staff.data ?? []).filter((u) => u.active || held.has(u.id)).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    ...[...held.keys()].filter((id) => !staff.data?.some((u) => u.id === id))
      .map((id) => ({ id, name: held.get(id)![0].userName ?? 'Unknown login', email: held.get(id)![0].userEmail ?? '', role: '' })),
  ].sort((a, b) => Number(held.has(b.id)) - Number(held.has(a.id)) || a.name.localeCompare(b.name))

  const release = (d: SignedInDevice, who: string) =>
    Alert.alert('Release this login?', `${who} will be signed out of ${d.deviceName || d.platform} and can sign in on another phone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Release', style: 'destructive', onPress: async () => {
          await api.post(`/admin/pos/devices/${d.id}/release`, { reason: 'Released by admin (all logins)' })
          qc.invalidateQueries({ queryKey: ['pos-devices-all'] })
        },
      },
    ])

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      data={logins}
      keyExtractor={(l) => l.id}
      refreshing={devices.isFetching}
      onRefresh={() => { devices.refetch(); staff.refetch() }}
      ListHeaderComponent={<Subtitle>Each login works on one phone at a time. Release it to let that login sign in somewhere else.</Subtitle>}
      ListEmptyComponent={<EmptyState icon="users" title="No logins yet" />}
      renderItem={({ item }) => {
        const ds = held.get(item.id) ?? []
        return (
          <Card style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{item.name}</Text>
                <Subtitle>{item.email}{item.role === 'ADMIN' ? ' · Admin' : ''}</Subtitle>
              </View>
              <Badge label={ds.length ? 'Signed in' : 'Free'} tone={ds.length ? 'success' : 'neutral'} />
            </View>
            {ds.map((d) => (
              <View key={d.id} style={{ gap: spacing.xs, marginTop: spacing.xs }}>
                <Text style={{ fontFamily: font.medium, color: colors.text }}>{d.deviceName || d.platform}</Text>
                <Subtitle>
                  {d.appVersion ? `v${d.appVersion} · ` : ''}Last seen {new Date(d.lastSeenAt).toLocaleString()}
                </Subtitle>
                <Button label="Release this login" variant="danger" onPress={() => release(d, item.name)} />
              </View>
            ))}
          </Card>
        )
      }}
    />
  )
}

function MyDevices() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['pos-devices'],
    queryFn: async () => (await api.get<DeviceView[]>('/admin/pos/devices/me')).data,
  })

  if (isLoading) return <Loading />
  if (!data?.length) return <EmptyState icon="smartphone" title="No devices on record" />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      data={data}
      keyExtractor={(d) => d.id}
      renderItem={({ item }) => (
        <Card style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>
              {item.deviceName || item.platform}
            </Text>
            <Badge label={item.active ? 'Active' : 'Released'} tone={item.active ? 'success' : 'neutral'} />
          </View>
          <Subtitle>
            {item.appVersion ? `v${item.appVersion} · ` : ''}
            Last seen {new Date(item.lastSeenAt).toLocaleString()}
          </Subtitle>
          {item.active && (
            <Button
              label="Release this device"
              variant="danger"
              onPress={async () => {
                await api.post(`/admin/pos/devices/${item.id}/release`, { reason: 'Released from app' })
                qc.invalidateQueries({ queryKey: ['pos-devices'] })
              }}
            />
          )}
        </Card>
      )}
    />
  )
}
