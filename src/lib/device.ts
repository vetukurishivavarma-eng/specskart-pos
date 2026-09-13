import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const DEVICE_ID_KEY = 'specskart_pos_device_id'

/** Generated on first launch and kept in SecureStore. A reinstall deliberately looks like a
 *  new device — the old install's id is gone with it, matching NG POS's device-session rule. */
export async function getDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (!id) {
    id = Crypto.randomUUID()
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id)
  }
  return id
}

export function deviceName(): string {
  return Platform.OS === 'android' ? 'Android device' : 'iOS device'
}
