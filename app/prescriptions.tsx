import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { Prescriptions } from '../src/components/Prescriptions'
import { api } from '../src/lib/api'
import { colors, font, spacing } from '../src/theme'
import { Field, ListRow, Loading } from '../src/ui/components'

type Lead = { id: string; name: string | null; whatsappNumber: string }

/** Any customer's prescriptions by phone number or name -- including walk-ins who never messaged us --
 *  and where a paper prescription brought to the shop gets added. */
export default function PrescriptionsScreen() {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Lead | null>(null)
  const q = query.trim()
  const byName = /[a-z]/i.test(q) // letters = a name; digits only = a phone number, looked up as before
  const { data: matches, isLoading } = useQuery({
    queryKey: ['rx-name', q],
    queryFn: async () => (await api.get<{ content: Lead[] }>('/admin/leads', { params: { page: 0, size: 20, q } })).data.content,
    enabled: byName && q.length >= 2 && !picked,
  })
  const phone = picked ? picked.whatsappNumber : byName ? '' : query

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Field label="Customer's name or phone number" value={picked ? picked.name || query : query}
        onChangeText={(t) => { setPicked(null); setQuery(t) }} placeholder="e.g. Mwila or 0971234567" autoFocus />
      {byName && !picked && isLoading && <Loading />}
      {byName && !picked && matches?.map((l) => (
        <ListRow key={l.id} icon="user" title={l.name || 'Unknown'}
          subtitle={`+${l.whatsappNumber.replace(/\D/g, '')}`} onPress={() => setPicked(l)} />
      ))}
      {byName && !picked && q.length >= 2 && matches?.length === 0 && (
        <Text style={{ fontFamily: font.medium, color: colors.textMuted }}>No customer by that name. Try their number.</Text>
      )}
      {(picked || !byName) && <Prescriptions phone={phone} />}
    </ScrollView>
  )
}
