import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const KEY = 'pos_day_reminder'
const NOTIFICATION_ID = 'day-report-reminder'

export type ReminderConfig = { enabled: boolean; hour: number; minute: number }
export const DEFAULT_REMINDER: ReminderConfig = { enabled: false, hour: 20, minute: 30 }

type ReminderState = {
  config: ReminderConfig
  hydrated: boolean
  restore: () => Promise<void>
  save: (config: ReminderConfig) => Promise<boolean>
}

/** Local daily reminder to close the day report — local rather than push since it has to
 *  fire on a till sitting in a shop with no signal, exactly when a day is most likely to
 *  go unclosed. */
export const useReminder = create<ReminderState>((set) => ({
  config: DEFAULT_REMINDER,
  hydrated: false,

  restore: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY)
      const config = raw ? ({ ...DEFAULT_REMINDER, ...JSON.parse(raw) } as ReminderConfig) : DEFAULT_REMINDER
      set({ config, hydrated: true })
      // Android clears scheduled notifications on some OEM "force stop" paths,
      // so re-assert the schedule on every launch rather than trusting it.
      await applyReminder(config)
    } catch {
      set({ config: DEFAULT_REMINDER, hydrated: true })
    }
  },

  save: async (config) => {
    const scheduled = await applyReminder(config)
    const stored = scheduled ? config : { ...config, enabled: false }
    await SecureStore.setItemAsync(KEY, JSON.stringify(stored))
    set({ config: stored })
    return scheduled
  },
}))

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const asked = await Notifications.requestPermissionsAsync()
  return asked.granted
}

async function applyReminder(config: ReminderConfig): Promise<boolean> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID).catch(() => {})
  if (!config.enabled) return false
  if (!(await ensureNotificationPermission())) return false

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: { title: 'Close the day', body: "Don't forget to run today's day report before you lock up." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: config.hour, minute: config.minute },
  })
  return true
}
