import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { api } from '../../src/lib/api'
import { useAuth } from '../../src/lib/auth'
import { StaffMember } from '../../src/lib/pos'
import { colors, font, spacing } from '../../src/theme'
import { Button, Card, Field, ListRow, Loading, RowDivider, Select, Title, Toggle } from '../../src/ui/components'

const ROLES = [
  { value: 'AGENT', label: 'Staff (AGENT)' },
  { value: 'ADMIN', label: 'Admin' },
] as const

export default function Staff() {
  const currentUser = useAuth((s) => s.user)
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('AGENT')

  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get<StaffMember[]>('/admin/users', { params: { includeInactive: true } })).data,
  })

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
    await api.post('/admin/users', { email: email.trim(), fullName: fullName.trim(), password, role })
    setEmail(''); setFullName(''); setPassword(''); setRole('AGENT'); setAdding(false)
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
          subtitle={`${item.email} · ${item.role}`}
          trailing={
            <Toggle label="" value={item.active} onChange={() => toggleActive(item)} />
          }
        />
      )}
    />
  )
}
