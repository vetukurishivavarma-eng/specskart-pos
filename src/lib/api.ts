import axios from 'axios'
import Constants from 'expo-constants'
import { useAuth } from './auth'

// Same backend as the Specskart website — no separate POS service/DB. Baked in at build
// time via app.json `extra.apiBaseUrl`; falls back to the live prod API.
const BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)
  ?? 'https://specskart-api.onrender.com/api'

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) useAuth.getState().logout()
    return Promise.reject(err)
  }
)

export function apiError(err: unknown): string {
  const msg = (err as any)?.response?.data?.message
  return typeof msg === 'string' ? msg : 'Something went wrong. Try again.'
}
