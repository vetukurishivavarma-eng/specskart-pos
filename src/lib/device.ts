import * as Crypto from 'expo-crypto'
import * as Device from 'expo-device'
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

/**
 * What this handset is called on the Devices screen.
 *
 * This used to return the literal string "Android device" for every phone in the shop, which
 * made the screen useless for the one thing it exists for — working out which handset to sign
 * out. Now: the name the owner gave the phone if Android will tell us (it is null on plenty of
 * devices, and on Android 12+ needs a name to have been set at all), else the brand and model,
 * which is always there.
 */
export function deviceName(): string {
  const given = Device.deviceName?.trim()
  if (given) return given
  const model = [Device.brand, Device.modelName].filter(Boolean).join(' ').trim()
  if (model) return model
  return Platform.OS === 'android' ? 'Android device' : 'iOS device'
}
