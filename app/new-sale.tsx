import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { api, apiError } from '../src/lib/api'
import { useAuth } from '../src/lib/auth'

const LENS_TYPES = [
  { code: 'CLEAR', label: 'Clear' },
  { code: 'PHOTOCHROMATIC', label: 'Photochromatic' },
]
const ADD_OPTIONS = [
  { code: null, label: 'None' },
  { code: 'BIFOCAL', label: 'Bifocal' },
  { code: 'PROGRESSIVE', label: 'Progressive' },
]
const PAYMENT_METHODS = ['CASH', 'CARD', 'MOBILE']

export default function NewSale() {
  const router = useRouter()
  const user = useAuth((s) => s.user)

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [lensType, setLensType] = useState('CLEAR')
  const [blueBlock, setBlueBlock] = useState(false)
  const [structure, setStructure] = useState<string | null>(null)
  const [method, setMethod] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = customerName.trim().length > 0 && method

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await api.post('/admin/lens-sales/walk-in', {
        customerName: customerName.trim(),
        phone: phone.trim() || null,
        lensType,
        blueBlock,
        addPower: structure ? 1 : null, // ponytail: counter sale just picks bifocal/progressive directly, doesn't ask the exact Add power
        lensStructure: structure,
        paymentMethod: method,
        soldBy: user?.name ?? user?.email,
        shopName: null,
      })
      router.replace('/')
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Field label="Customer name">
        <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder="Required" />
      </Field>
      <Field label="Phone (optional)">
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </Field>

      <Field label="Lens type">
        <View style={styles.chips}>
          {LENS_TYPES.map((t) => (
            <Chip key={t.code} label={t.label} active={lensType === t.code} onPress={() => setLensType(t.code)} />
          ))}
        </View>
      </Field>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Blue-light block</Text>
        <Switch value={blueBlock} onValueChange={setBlueBlock} />
      </View>

      <Field label="Add-on">
        <View style={styles.chips}>
          {ADD_OPTIONS.map((o) => (
            <Chip key={o.label} label={o.label} active={structure === o.code} onPress={() => setStructure(o.code)} />
          ))}
        </View>
      </Field>

      <Field label="Payment method">
        <View style={styles.chips}>
          {PAYMENT_METHODS.map((m) => (
            <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>
      </Field>

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} onPress={submit} disabled={!canSubmit || busy}>
        <Text style={styles.buttonText}>{busy ? 'Billing…' : 'Complete sale'}</Text>
      </Pressable>
    </ScrollView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  fieldLabel: { fontWeight: '600', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  chipText: { fontWeight: '600', color: '#333' },
  chipTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontWeight: '600', color: '#333' },
  button: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#c0392b' },
})
