import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { FlatList, Text, View } from 'react-native'
import { api } from '../../src/lib/api'
import { DeviceView, StaffDetail, StoreView } from '../../src/lib/pos'
import { colors, font, spacing } from '../../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Select, Subtitle, Title, Toggle } from '../../src/ui/components'

export default function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-detail', id],
    queryFn: async () => (await api.get<StaffDetail>(`/admin/users/${id}`)).data,
  })
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['staff-devices', id],
    queryFn: async () => (await api.get<DeviceView[]>(`/admin/pos/devices/user/${id}`)).data,
  })
  const { data: stores } = useQuery({
    queryKey: ['pos-stores-admin'],
    queryFn: async () => (await api.get<StoreView[]>('/admin/pos/stores')).data,
  })

  if (staffLoading || !staff) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      data={devices ?? []}
      keyExtractor={(d) => d.id}
      ListHeaderComponent={
        <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <Title>{staff.name || staff.email}</Title>
          <Subtitle>{staff.email} · {staff.role}</Subtitle>
          <Toggle
            label="Active"
            value={staff.active}
            onChange={async (active) => {
              await api.patch(`/admin/users/${id}`, { active })
              qc.invalidateQueries({ queryKey: ['staff-detail', id] })
              qc.invalidateQueries({ queryKey: ['staff'] })
            }}
          />
          {/* Can move a login to a different shop, but not clear it back to unscoped from
              here -- see AdminUserController.UpdateUser. Delete + re-create for that. */}
          <Select
            label="Shop"
            value={staff.storeId ?? ''}
            options={(stores ?? []).map((s) => ({ value: s.id, label: s.name }))}
            onChange={async (storeId) => {
              await api.patch(`/admin/users/${id}`, { storeId })
              qc.invalidateQueries({ queryKey: ['staff-detail', id] })
              qc.invalidateQueries({ queryKey: ['staff'] })
            }}
          />
        </Card>
      }
      ListEmptyComponent={!devicesLoading ? <EmptyState icon="smartphone" title="No devices on record" /> : null}
      renderItem={({ item }) => (
        <Card style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
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
                await api.post(`/admin/pos/devices/${item.id}/release`, { reason: 'Released by admin' })
                qc.invalidateQueries({ queryKey: ['staff-devices', id] })
              }}
            />
          )}
        </Card>
      )}
    />
  )
}
