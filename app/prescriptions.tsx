import { useState } from 'react'
import { ScrollView } from 'react-native'
import { Prescriptions } from '../src/components/Prescriptions'
import { spacing } from '../src/theme'
import { Field } from '../src/ui/components'

/** Any customer's prescriptions by phone number -- including walk-ins who never messaged us --
 *  and where a paper prescription brought to the shop gets added. */
export default function PrescriptionsScreen() {
  const [phone, setPhone] = useState('')
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
      <Field label="Customer's phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
        placeholder="e.g. 0971234567" autoFocus />
      <Prescriptions phone={phone} askName />
    </ScrollView>
  )
}
