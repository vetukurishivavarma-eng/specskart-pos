import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { api } from '../../src/lib/api'
import { useAuth } from '../../src/lib/auth'
import { StaffMember, StoreView } from '../../src/lib/pos'
import { colors, font, spacing } from '../../src/theme'
import { Button, Card, Field, ListRow, Loading, RowDivider, Select, Title, Toggle } from '../../src/ui/components'

const ROLES = [
  { value: 'AGENT', label: 'Staff (AGENT)' },
  { value: 'ADMIN', label: 'Admin' },
] as const

export default function Staff() {
  const currentUser = useAuth((s) => s.user)
  const router = useRouter()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('AGENT')
  const [storeId, setStoreId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get<StaffMember[]>('/admin/users', { params: { includeInactive: true } })).data,
  })
  const { data: stores } = useQuery({
    queryKey: ['pos-stores-admin'],
    queryFn: async () => (await api.get<StoreView[]>('/admin/pos/stores')).data,
  })
  const storeName = (id: string | null) => stores?.find((s) => s.id === id)?.name

  if (currentUser?.role !== 'ADMIN') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Text style={{ fontFamily: font.medium, color: colors.textMuted, textAlign: 'center' }}>
          Staff management is admin-only.
        </Text>
      </View>
    )
  }

  async function addStaff() {
    if (!email.trim() || !password) return
    await api.post('/admin/users', {
      email: email.trim(), fullName: fullName.trim(), password, role,
      storeId: storeId || null,
    })
    setEmail(''); setFullName(''); setPassword(''); setRole('AGENT'); setStoreId(''); setAdding(false)
    qc.invalidateQueries({ queryKey: ['staff'] })
  }

  async function toggleActive(u: StaffMember) {
    await api.patch(`/admin/users/${u.id}`, { active: !u.active })
    qc.invalidateQueries({ queryKey: ['staff'] })
  }

  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(u) => u.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Title>Staff</Title>
          {adding ? (
            <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
              <Field label="Full name" value={fullName} onChangeText={setFullName} />
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
              <Select label="Role" value={role} options={ROLES as any} onChange={setRole} />
              <Select
                label="Shop (leave unpicked for admin/unscoped)"
                value={storeId}
                options={[{ value: '', label: 'Unscoped (sees every shop)' }, ...(stores ?? []).map((s) => ({ value: s.id, label: s.name }))]}
                onChange={setStoreId}
              />
              <Button label="Create account" onPress={addStaff} disabled={!email.trim() || !password} />
            </Card>
          ) : (
            <Button label="+ Add staff" variant="secondary" onPress={() => setAdding(true)} style={{ marginTop: spacing.md }} />
          )}
        </View>
      }
      renderItem={({ item }) => (
        <ListRow
          icon="user"
          title={item.name || item.email}
          subtitle={`${item.email} · ${item.role} · ${storeName(item.storeId) ?? 'Unscoped'}`}
          onPress={() => router.push(`/users/${item.id}`)}
          trailing={
            <Toggle label="" value={item.active} onChange={() => toggleActive(item)} />
          }
        />
      )}
    />
  )
}
