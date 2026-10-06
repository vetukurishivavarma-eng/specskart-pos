import axios from 'axios'
import Constants from 'expo-constants'
import { useAuth } from './auth'
import { getDeviceId } from './device'

// Same backend as the Specskart website — no separate POS service/DB. Baked in at build
// time via app.json `extra.apiBaseUrl`; falls back to the live prod API.
const BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)
  ?? 'https://specskart-api-9b08.onrender.com/api'

export const api = axios.create({ baseURL: BASE_URL })

/** Backend-relative asset paths (e.g. /api/public/product-images/…) as a full URL. */
export const assetUrl = (u: string) => (u.startsWith('http') ? u : BASE_URL.replace(/\/api\/?$/, '') + u)

// Every request says which phone and which build it is, so the Devices screen shows a phone's
// real version as soon as it updates -- not only after its next sign-in.
const APP_VERSION = Constants.expoConfig?.version ?? ''
let deviceId: Promise<string> | null = null

api.interceptors.request.use(async (config) => {
  const token = useAuth.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  deviceId ??= getDeviceId().catch(() => '')
  const id = await deviceId
  if (id) config.headers['X-Device-Id'] = id
  if (APP_VERSION) config.headers['X-App-Version'] = APP_VERSION
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
