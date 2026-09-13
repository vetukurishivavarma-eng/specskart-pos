import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'

export type StoreView = { id: string; name: string; code: string; city: string; active: boolean }

type ActiveStoreState = {
  store: StoreView | null
  hydrated: boolean
  hydrate: () => Promise<void>
  select: (store: StoreView) => Promise<void>
}

const KEY = 'specskart_pos_active_store'

// Almost every POS endpoint (stock, sales) is scoped to a store, so this has to be picked
// before those screens make sense — same reason NG POS gates on a store selection too.
export const useActiveStore = create<ActiveStoreState>((set) => ({
  store: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY)
      set({ store: raw ? JSON.parse(raw) : null, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
  select: async (store) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(store))
    set({ store })
  },
}))
