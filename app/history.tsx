import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList } from 'react-native'
import { api } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'
import { StoreView } from '../src/lib/pos'
import { spacing } from '../src/theme'
import { EmptyState, ListRow, Loading, RowDivider, Select, Title } from '../src/ui/components'

type AuditEntry = {
  id: string
  entityType: string
  entityId: string | null
  action: string
  actorName: string
  storeId: string | null
  summary: string
  createdAt: string
}

const ENTITY_TYPES = [
  { value: '', label: 'Everything' },
  { value: 'SALE', label: 'Sales' },
  { value: 'STOCK', label: 'Stock' },
  { value: 'PRICE', label: 'Prices' },
  { value: 'PURCHASE', label: 'Purchases' },
  { value: 'TRANSFER', label: 'Transfers' },
  { value: 'USER', label: 'Staff' },
  { value: 'STORE', label: 'Shops' },
  { value: 'APP_RELEASE', label: 'App releases' },
] as const

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const

export default function History() {
  const user = useAuth((s) => s.user)
  const [entityType, setEntityType] = useState('')
  const [storeId, setStoreId] = useState('')
  const [days, setDays] = useState('30')

  const { data: stores } = useQuery({
    queryKey: ['pos-stores-admin'],
    queryFn: async () => (await api.get<StoreView[]>('/admin/pos/stores')).data,
    enabled: user?.role === 'ADMIN',
  })
  const storeName = (id: string | null) => stores?.find((s) => s.id === id)?.name

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', entityType, storeId, days],
    queryFn: async () => {
      const to = new Date().toISOString().slice(0, 10)
      const from = new Date(Date.now() - Number(days) * 86400_000).toISOString().slice(0, 10)
      return (await api.get<AuditEntry[]>('/admin/audit-log', {
        params: { entityType: entityType || undefined, storeId: storeId || undefined, from, to },
      })).data
    },
    enabled: user?.role === 'ADMIN',
  })

  if (user?.role !== 'ADMIN') {
    return <EmptyState icon="lock" title="Admin-only" hint="Every shop's own activity is already visible live in the app." />
  }
  if (isLoading) return <Loading />

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(a) => a.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <>
          <Title style={{ marginBottom: spacing.sm }}>History</Title>
          <Select value={entityType} options={ENTITY_TYPES as any} onChange={setEntityType} />
          <Select
            value={storeId}
            options={[{ value: '', label: 'Every shop' }, ...(stores ?? []).map((s) => ({ value: s.id, label: s.name }))]}
            onChange={setStoreId}
          />
          <Select value={days} options={RANGES as any} onChange={setDays} />
        </>
      }
      ListEmptyComponent={<EmptyState icon="clock" title="Nothing in this range" />}
      renderItem={({ item }) => {
        const parts = [
          new Date(item.createdAt).toLocaleString(),
          item.actorName || 'System',
          ...(item.storeId ? [storeName(item.storeId) ?? 'Unknown shop'] : []),
        ]
        return (
          <ListRow
            title={`${item.entityType} · ${item.action}${item.summary ? ' — ' + item.summary : ''}`}
            subtitle={parts.join(' · ')}
          />
        )
      }}
    />
  )
}
