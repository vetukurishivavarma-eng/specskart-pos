import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { api } from './api'
import { useAppUpdate } from '../store/appUpdate'
import { ensureNotificationPermission } from './reminder'

/** Must match PushService.CHANNEL on the server. */
const CHANNEL = 'orders'

// A new order should make noise even while the app is open on the counter.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Registers this phone for staff order notifications (Firebase Cloud Messaging, free). Called
 * after every sign-in; harmless to repeat. Fails quietly -- a build without Firebase configured,
 * or a refused permission, just means no notifications, never a broken login.
 */
export async function registerForOrderNotifications(): Promise<void> {
  if (Platform.OS !== 'android') return
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'New orders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 300, 200, 300],
    })
    if (!(await ensureNotificationPermission())) return
    const { data } = await Notifications.getDevicePushTokenAsync()
    if (typeof data === 'string' && data) await api.post('/admin/push-token', { token: data })
  } catch {
    // no Firebase in this build / no Play services / offline: try again next sign-in
  }
}

/** Sent by the server when a mandatory release is published (AdminAppReleaseController). */
const UPDATE_PATH = '/update'

// A till left open on the counter never comes back to the foreground, so the usual
// on-foreground check would not see a new release until tomorrow; the push makes it look now.
Notifications.addNotificationReceivedListener((n) => {
  if (n.request.content.data?.path === UPDATE_PATH) void useAppUpdate.getState().check({ force: true })
})

/** Where a tapped notification wants to go ("/orders?id=..."), or null. */
export function pathOf(response: Notifications.NotificationResponse | null): string | null {
  const path = response?.notification.request.content.data?.path
  if (path === UPDATE_PATH) {
    void useAppUpdate.getState().check({ force: true }) // the gate takes it from there
    return null
  }
  return typeof path === 'string' && path.startsWith('/') ? path : null
}
