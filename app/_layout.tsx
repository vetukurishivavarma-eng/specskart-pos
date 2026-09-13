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
import { useEffect } from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { colors } from '../src/theme'
import { Loading } from '../src/ui/components'
import { useActiveStore } from '../src/lib/activeStore'
import { useAuth } from '../src/lib/auth'

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
    const onLogin = segments[0] === 'login'
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
        <StatusBar style="light" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="orders" options={{ headerShown: true, title: 'Web orders' }} />
            <Stack.Screen name="pricing" options={{ headerShown: true, title: 'Lens pricing' }} />
            <Stack.Screen name="devices" options={{ headerShown: true, title: 'My devices' }} />
            <Stack.Screen
              name="store-picker"
              options={{ presentation: 'modal', headerShown: true, title: 'Choose a shop' }}
            />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
