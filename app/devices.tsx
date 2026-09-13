import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FlatList, Text, View } from 'react-native'
import { api } from '../src/lib/api'
import { DeviceView } from '../src/lib/pos'
import { colors, font, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Loading, Subtitle } from '../src/ui/components'

export default function Devices() {
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
