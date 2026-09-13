import { useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DEFAULT_REMINDER, ReminderConfig, useReminder } from '../src/lib/reminder'
import { colors, font, radius, spacing } from '../src/theme'
import { Button, Card, Icon, SectionLabel, Toggle } from '../src/ui/components'

const PRESETS: { hour: number; minute: number }[] = [
  { hour: 17, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 19, minute: 30 },
  { hour: 20, minute: 30 },
  { hour: 21, minute: 0 },
]

function formatTime(hour: number, minute: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12
  const period = hour < 12 ? 'AM' : 'PM'
  return `${h}:${String(minute).padStart(2, '0')} ${period}`
}

export default function ReminderScreen() {
  const config = useReminder((s) => s.config)
  const save = useReminder((s) => s.save)
  const [draft, setDraft] = useState<ReminderConfig>(config ?? DEFAULT_REMINDER)
  const [busy, setBusy] = useState(false)

  const dirty = draft.enabled !== config.enabled || draft.hour !== config.hour || draft.minute !== config.minute

  function shift(minutes: number) {
    const total = (draft.hour * 60 + draft.minute + minutes + 24 * 60) % (24 * 60)
    setDraft({ ...draft, hour: Math.floor(total / 60), minute: total % 60 })
  }

  async function apply() {
    setBusy(true)
    try {
      const scheduled = await save(draft)
      if (draft.enabled && !scheduled) {
        Alert.alert(
          'Notifications are blocked',
          'This device is not letting Specskart POS post notifications, so the reminder cannot be set. Allow notifications and try again.',
          [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }],
        )
        setDraft(useReminder.getState().config)
        return
      }
      if (scheduled) {
        Alert.alert('Reminder set', `You'll be prompted to close the day at ${formatTime(draft.hour, draft.minute)} every day.`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Card>
        <Toggle
          label="Daily reminder"
          hint="A notification at closing time to run the day report and end the session."
          value={draft.enabled}
          onChange={(enabled) => setDraft({ ...draft, enabled })}
        />
      </Card>

      <Card style={!draft.enabled && { opacity: 0.45 }}>
        <View pointerEvents={draft.enabled ? 'auto' : 'none'}>
          <SectionLabel>Time</SectionLabel>
          <View style={styles.clock}>
            <Pressable onPress={() => shift(-30)} style={styles.clockBtn} hitSlop={6}>
              <Icon name="minus" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.clockValue}>{formatTime(draft.hour, draft.minute)}</Text>
            <Pressable onPress={() => shift(30)} style={styles.clockBtn} hitSlop={6}>
              <Icon name="plus" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const active = draft.hour === p.hour && draft.minute === p.minute
              return (
                <Pressable key={formatTime(p.hour, p.minute)} onPress={() => setDraft({ ...draft, ...p })} style={[styles.preset, active && styles.presetActive]}>
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>{formatTime(p.hour, p.minute)}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </Card>

      <Button label={draft.enabled ? 'Save reminder' : 'Turn off reminder'} loading={busy} disabled={!dirty} onPress={apply} size="lg" />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.canvas, borderRadius: radius.lg, padding: spacing.sm },
  clockBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  clockValue: { fontFamily: font.extrabold, fontSize: 34, color: colors.text, letterSpacing: -1 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  preset: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.canvas },
  presetActive: { backgroundColor: colors.primary },
  presetText: { fontFamily: font.semibold, fontSize: 12, color: colors.textMuted },
  presetTextActive: { color: '#fff' },
})
