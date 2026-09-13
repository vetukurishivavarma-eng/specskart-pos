import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, View } from 'react-native'
import { api } from '../src/lib/api'
import { StoreView } from '../src/lib/pos'
import { spacing } from '../src/theme'
import { Badge, Button, Card, Field, ListRow, RowDivider, Title, Toggle } from '../src/ui/components'

export default function Shops() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [city, setCity] = useState('')

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
        <ListRow
          icon="home"
          title={item.name}
          subtitle={`${item.code}${item.city ? ` · ${item.city}` : ''}`}
          trailing={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {!item.active && <Badge label="Inactive" tone="neutral" />}
              <Toggle label="" value={item.active} onChange={() => toggleActive(item)} />
            </View>
          }
        />
      )}
    />
  )
}
