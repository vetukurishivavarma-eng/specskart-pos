import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { StoreView } from '../src/lib/pos'
import { spacing } from '../src/theme'
import { Badge, Button, Card, Field, ListRow, RowDivider, Title, Toggle } from '../src/ui/components'

export default function Shops() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [city, setCity] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')

  const { data } = useQuery({
    queryKey: ['pos-stores-admin'],
    queryFn: async () => (await api.get<StoreView[]>('/admin/pos/stores')).data,
  })

  async function addShop() {
    if (!name.trim() || !code.trim()) return
    await api.post('/admin/pos/stores', { name: name.trim(), code: code.trim(), city: city.trim() })
    setName(''); setCode(''); setCity(''); setAdding(false)
    qc.invalidateQueries({ queryKey: ['pos-stores-admin'] })
    qc.invalidateQueries({ queryKey: ['pos-stores'] })
  }

  async function saveLocation(s: StoreView) {
    try {
      await api.put(`/admin/pos/stores/${s.id}`, { location: location.trim() })
      setEditing(null)
      setError('')
      qc.invalidateQueries({ queryKey: ['pos-stores-admin'] })
    } catch (e) {
      setError(apiError(e))
    }
  }

  async function toggleActive(s: StoreView) {
    await api.put(`/admin/pos/stores/${s.id}`, { active: !s.active })
    qc.invalidateQueries({ queryKey: ['pos-stores-admin'] })
    qc.invalidateQueries({ queryKey: ['pos-stores'] })
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(s) => s.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Title>Shops</Title>
          {adding ? (
            <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
              <Field label="Name" value={name} onChangeText={setName} />
              <Field label="Code" value={code} onChangeText={setCode} autoCapitalize="characters" />
              <Field label="City" value={city} onChangeText={setCity} />
              <Button label="Add shop" onPress={addShop} disabled={!name.trim() || !code.trim()} />
            </Card>
          ) : (
            <Button label="+ Add shop" variant="secondary" onPress={() => setAdding(true)} style={{ marginTop: spacing.md }} />
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View>
        <ListRow
          icon="home"
          title={item.name}
          subtitle={`${item.code}${item.city ? ` · ${item.city}` : ''} · ${item.latitude != null ? '📍 ships online orders' : 'no map pin, not used for online orders'}`}
          onPress={() => {
            setEditing(editing === item.id ? null : item.id)
            setLocation(item.latitude != null ? `${item.latitude}, ${item.longitude}` : '')
            setError('')
          }}
          trailing={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {!item.active && <Badge label="Inactive" tone="neutral" />}
              <Toggle label="" value={item.active} onChange={() => toggleActive(item)} />
            </View>
          }
        />
        {editing === item.id && (
          <Card style={{ marginBottom: spacing.md, gap: spacing.md }}>
            <Field
              label="Map location (lat, lng)"
              value={location}
              onChangeText={setLocation}
              placeholder="-15.4167, 28.2833"
              autoCapitalize="none"
              hint="Google Maps: long-press the shop, copy the numbers. Empty = this shop stops shipping online orders."
              error={error || undefined}
            />
            <Button label="Save location" onPress={() => saveLocation(item)} />
          </Card>
        )}
        </View>
      )}
    />
  )
}
