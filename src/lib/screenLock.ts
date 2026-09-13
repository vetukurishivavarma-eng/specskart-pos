import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

const PIN_KEY = 'specskart_pos_lock_pin_hash'

/** Time away before returning to the app re-locks it. Matches NG POS's own rule: a
 *  notification-shade pull or a permission dialog also backgrounds the app briefly and
 *  shouldn't lock it every time. */
export const LOCK_AFTER_BACKGROUND_MS = 2 * 60_000

type ScreenLockState = {
  configured: boolean | null // null until SecureStore has been read
  locked: boolean
  restore: () => Promise<void>
  configure: (pin: string) => Promise<void>
  disable: () => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
}

async function hash(pin: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin)
}

// Local device lock only -- not a backend auth boundary, so a fast SHA-256 (not bcrypt) of a
// short PIN is fine here; nothing is transmitted or stored server-side.
export const useScreenLock = create<ScreenLockState>((set, get) => ({
  configured: null,
  locked: false,
  restore: async () => {
    const stored = await SecureStore.getItemAsync(PIN_KEY)
    set({ configured: !!stored })
  },
  configure: async (pin) => {
    await SecureStore.setItemAsync(PIN_KEY, await hash(pin))
    set({ configured: true })
  },
  disable: async () => {
    await SecureStore.deleteItemAsync(PIN_KEY)
    set({ configured: false, locked: false })
  },
  unlock: async (pin) => {
    const stored = await SecureStore.getItemAsync(PIN_KEY)
    if (stored && stored === (await hash(pin))) {
      set({ locked: false })
      return true
    }
    return false
  },
  lock: () => {
    if (get().configured) set({ locked: true })
  },
}))
