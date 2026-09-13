import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'

export type SessionUser = { email: string; name: string; role: string }

type AuthState = {
  token: string | null
  user: SessionUser | null
  hydrated: boolean
  hydrate: () => Promise<void>
  login: (token: string, user: SessionUser) => Promise<void>
  logout: () => Promise<void>
}

// ponytail: one shared key each, no multi-account switching — one till, one login,
// same rule NG POS uses for a device session.
const TOKEN_KEY = 'specskart_pos_token'
const USER_KEY = 'specskart_pos_user'

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: async () => {
    const [token, userRaw] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ])
    set({ token, user: userRaw ? JSON.parse(userRaw) : null, hydrated: true })
  },
  login: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
    set({ token, user })
  },
  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
    set({ token: null, user: null })
  },
}))
