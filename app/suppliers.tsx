import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, View } from 'react-native'
import { api } from '../src/lib/api'
import { SupplierView } from '../src/lib/pos'
import { spacing } from '../src/theme'
import { Button, Card, Field, ListRow, Loading, RowDivider, Title } from '../src/ui/components'

export default function Suppliers() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['pos-suppliers'],
    queryFn: async () => (await api.get<SupplierView[]>('/admin/pos/suppliers')).data,
  })

  async function add() {
    if (!name.trim()) return
    await api.post('/admin/pos/suppliers', { name: name.trim(), contactName: '', phone: phone.trim(), email: '', address: '', notes: '' })
    setName('')
    setPhone('')
    setAdding(false)
    qc.invalidateQueries({ queryKey: ['pos-suppliers'] })
  }

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(s) => s.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Title>Suppliers</Title>
          {adding ? (
            <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
              <Field label="Supplier name" value={name} onChangeText={setName} placeholder="Required" />
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Button label="Add supplier" onPress={add} disabled={!name.trim()} />
            </Card>
          ) : (
            <Button label="+ Add supplier" variant="secondary" onPress={() => setAdding(true)} style={{ marginTop: spacing.md }} />
          )}
        </View>
      }
      renderItem={({ item }) => (
        <ListRow
          icon="truck"
          title={item.name}
          subtitle={item.phone || item.email || 'No contact on file'}
        />
      )}
    />
  )
}
