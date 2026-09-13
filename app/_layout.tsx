import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef } from 'react'
import { AppState, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { colors, font } from '../src/theme'
import { Loading } from '../src/ui/components'
import { LockScreen } from '../src/ui/LockScreen'
import { UpdateGate } from '../src/ui/UpdateGate'
import { useActiveStore } from '../src/lib/activeStore'
import { useAuth } from '../src/lib/auth'
import { LOCK_AFTER_BACKGROUND_MS, useScreenLock } from '../src/lib/screenLock'
import { startOfflineQueueWatcher } from '../src/lib/offlineQueue'
import { useReminder } from '../src/lib/reminder'

// Shop staff work on patchy connections; don't hammer a dying link, and refresh
// on regaining focus/reconnect since prices and orders are shared across devices.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true, refetchOnReconnect: true },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, hydrated, hydrate } = useAuth()
  const storeHydrated = useActiveStore((s) => s.hydrated)
  const hydrateStore = useActiveStore((s) => s.hydrate)
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => { hydrate(); hydrateStore() }, [])

  useEffect(() => {
    if (!hydrated) return
    const onLogin = segments[0] === 'login' || segments[0] === 'forgot-password'
    if (!token && !onLogin) router.replace('/login')
    if (token && onLogin) router.replace('/')
  }, [hydrated, token, segments])

  if (!hydrated || !storeHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
        <Loading />
      </View>
    )
  }
  return <>{children}</>
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Jakarta_400Regular: PlusJakartaSans_400Regular,
    Jakarta_500Medium: PlusJakartaSans_500Medium,
    Jakarta_600SemiBold: PlusJakartaSans_600SemiBold,
    Jakarta_700Bold: PlusJakartaSans_700Bold,
    Jakarta_800ExtraBold: PlusJakartaSans_800ExtraBold,
  })
  const { token } = useAuth()
  const restoreLock = useScreenLock((s) => s.restore)
  const lockConfigured = useScreenLock((s) => s.configured)
  const locked = useScreenLock((s) => s.locked)

  useEffect(() => { void restoreLock() }, [])
  useEffect(() => { void useReminder.getState().restore() }, [])
  useEffect(() => startOfflineQueueWatcher(), [])

  // Relock only after being away long enough -- a notification-shade pull or a permission
  // dialog also backgrounds the app briefly and shouldn't lock it every time.
  useEffect(() => {
    let leftAt: number | null = null
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        if (leftAt !== null && Date.now() - leftAt >= LOCK_AFTER_BACKGROUND_MS) {
          useScreenLock.getState().lock()
        }
        leftAt = null
      } else if (next === 'background' || next === 'inactive') {
        leftAt ??= Date.now()
      }
    })
    return () => sub.remove()
  }, [])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
        <Loading />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/* Dark icons/clock for the light canvas every screen but login uses -- login sets its
            own "light" override locally since it's the one dark-wash screen. Leaving this as
            "light" globally made the status bar unreadable everywhere else. */}
        <StatusBar style="dark" />
        <UpdateGate>
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.canvas },
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { fontFamily: font.bold, color: colors.text },
              headerTintColor: colors.text,
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="forgot-password" options={{ headerShown: true, title: 'Forgot password' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="orders" options={{ headerShown: true, title: 'Web orders' }} />
            <Stack.Screen name="pricing" options={{ headerShown: true, title: 'Lens pricing' }} />
            <Stack.Screen name="devices" options={{ headerShown: true, title: 'My devices' }} />
            <Stack.Screen name="suppliers" options={{ headerShown: true, title: 'Suppliers' }} />
            <Stack.Screen name="purchases/index" options={{ headerShown: true, title: 'Supplier invoices' }} />
            <Stack.Screen name="purchases/new" options={{ headerShown: true, title: 'Record a delivery' }} />
            <Stack.Screen name="purchases/[id]" options={{ headerShown: true, title: 'Invoice' }} />
            <Stack.Screen name="transfers/index" options={{ headerShown: true, title: 'Transfers' }} />
            <Stack.Screen name="transfers/new" options={{ headerShown: true, title: 'New transfer' }} />
            <Stack.Screen name="users/index" options={{ headerShown: true, title: 'Staff' }} />
            <Stack.Screen name="users/[id]" options={{ headerShown: true, title: 'Staff member' }} />
            <Stack.Screen name="day-report" options={{ headerShown: true, title: 'Day report' }} />
            <Stack.Screen name="screen-lock" options={{ headerShown: true, title: 'Screen Lock' }} />
            <Stack.Screen name="store-pricing" options={{ headerShown: true, title: 'Store pricing' }} />
            <Stack.Screen name="movements" options={{ headerShown: true, title: 'Stock movements' }} />
            <Stack.Screen name="stock-import" options={{ headerShown: true, title: 'Bulk stock upload' }} />
            <Stack.Screen name="sales" options={{ headerShown: true, title: 'Sales' }} />
            <Stack.Screen name="transaction/[id]" options={{ headerShown: true, title: 'Receipt' }} />
            <Stack.Screen name="refund" options={{ headerShown: true, title: 'Refund' }} />
            <Stack.Screen name="shops" options={{ headerShown: true, title: 'Shops' }} />
            <Stack.Screen name="reorder" options={{ headerShown: true, title: 'Reorder suggestions' }} />
            <Stack.Screen name="analytics" options={{ headerShown: true, title: 'Top products' }} />
            <Stack.Screen name="app-releases" options={{ headerShown: true, title: 'App releases' }} />
            <Stack.Screen name="reminder" options={{ headerShown: true, title: 'Day-close reminder' }} />
            <Stack.Screen
              name="store-picker"
              options={{ presentation: 'modal', headerShown: true, title: 'Choose a shop' }}
            />
            <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          </Stack>
        </AuthGate>
        {/* Over the navigator so a back gesture can't dismiss it -- shown only to a signed-in
            session, since it protects a live one rather than replacing the password. */}
        {locked && token ? <LockScreen /> : null}
        </UpdateGate>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
