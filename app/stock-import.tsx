import { useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import { api } from '../src/lib/api'
import { useActiveStore } from '../src/lib/activeStore'
import { colors, font, radius, spacing } from '../src/theme'
import { Badge, Button, Card, EmptyState, Subtitle, Title } from '../src/ui/components'

/** ponytail: paste-in text ("SKU,quantity" one per line, copied out of a spreadsheet) rather
 *  than a real file picker/CSV parser — covers the actual need (bulk-set counts from a sheet)
 *  without expo-document-picker + CSV-parsing complexity. Swap for a real file picker if staff
 *  need to upload a .csv file directly rather than copy-pasting its contents. */
export default function StockImport() {
  const store = useActiveStore((s) => s.store)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [skipped, setSkipped] = useState<string[] | null>(null)
  const [applied, setApplied] = useState(0)

  function parse() {
    return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [sku, qty] = line.split(',').map((s) => s.trim())
      return { sku, quantity: Number(qty) }
    }).filter((l) => l.sku && Number.isFinite(l.quantity))
  }

  async function submit() {
    if (!store) return
    const lines = parse()
    if (lines.length === 0) return
    setBusy(true)
    setSkipped(null)
    try {
      const { data } = await api.post<string[]>(`/admin/pos/stores/${store.id}/inventory/import`, lines)
      setSkipped(data)
      setApplied(lines.length - data.length)
      setText('')
    } finally {
      setBusy(false)
    }
  }

  if (!store) return <EmptyState icon="home" title="Pick a shop first" />

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Title>Bulk stock upload — {store.name}</Title>
      <Subtitle>
        Paste one line per product: SKU, then the counted quantity, separated by a comma.
        Sets the exact count from a physical stock-take — not an addition.
      </Subtitle>

      <Card>
        <TextInput
          style={{
            minHeight: 160, fontFamily: font.medium, fontSize: 14, color: colors.text,
            textAlignVertical: 'top', backgroundColor: colors.canvas, borderRadius: radius.md,
            borderWidth: 1.5, borderColor: colors.border, padding: spacing.md,
          }}
          placeholder={'FRAME-001, 12\nFRAME-002, 5'}
          placeholderTextColor={colors.textFaint}
          multiline
          value={text}
          onChangeText={setText}
        />
      </Card>

      <Button label={busy ? 'Uploading…' : 'Apply counts'} onPress={submit} disabled={!text.trim()} loading={busy} size="lg" />

      {skipped !== null && (
        <Card style={{ gap: spacing.sm }}>
          <Badge label={`${applied} updated`} tone="success" />
          {skipped.length > 0 && (
            <>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.danger }}>
                {skipped.length} SKU(s) not found — check for typos:
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.textMuted }}>{skipped.join(', ')}</Text>
            </>
          )}
        </Card>
      )}
    </ScrollView>
  )
}
