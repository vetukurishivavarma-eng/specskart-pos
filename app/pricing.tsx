import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { api } from '../src/lib/api'
import { PricingOption, money } from '../src/lib/lens'

export default function Pricing() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['lens-pricing'],
    queryFn: async () => (await api.get<PricingOption[]>('/admin/lens-pricing')).data,
  })

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => (
        <Row option={item} onSaved={() => qc.invalidateQueries({ queryKey: ['lens-pricing'] })} />
      )}
    />
  )
}

function Row({ option, onSaved }: { option: PricingOption; onSaved: () => void }) {
  const [price, setPrice] = useState((option.priceMinor / 100).toFixed(2))
  const [saving, setSaving] = useState(false)
  const dirty = Number(price) * 100 !== option.priceMinor

  async function save() {
    const minor = Math.round(Number(price) * 100)
    if (Number.isNaN(minor) || minor < 0) return
    setSaving(true)
    try {
      await api.patch(`/admin/lens-pricing/${option.id}`, { priceMinor: minor })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function toggleStock(v: boolean) {
    await api.patch(`/admin/lens-pricing/${option.id}`, { inStock: v })
    onSaved()
  }

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{option.label}</Text>
        <Text style={styles.current}>Current: {money(option.priceMinor)}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      {dirty && (
        <Pressable style={styles.save} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? '…' : 'Save'}</Text>
        </Pressable>
      )}
      <Switch value={option.inStock} onValueChange={toggleStock} />
    </View>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f4f4f4', borderRadius: 12, padding: 14 },
  label: { fontWeight: '600' },
  current: { color: '#666', fontSize: 12, marginTop: 2 },
  input: { width: 80, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, textAlign: 'right', backgroundColor: '#fff' },
  save: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 12 },
})
