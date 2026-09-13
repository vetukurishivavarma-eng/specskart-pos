import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from '../src/lib/auth'

const queryClient = new QueryClient()

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, hydrated, hydrate } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => { hydrate() }, [])

  useEffect(() => {
    if (!hydrated) return
    const onLogin = segments[0] === 'login'
    if (!token && !onLogin) router.replace('/login')
    if (token && onLogin) router.replace('/')
  }, [hydrated, token, segments])

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }
  return <>{children}</>
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthGate>
          <Stack screenOptions={{ headerTitleStyle: { fontWeight: '600' } }}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ title: 'Specskart POS' }} />
            <Stack.Screen name="pricing" options={{ title: 'Lens pricing' }} />
            <Stack.Screen name="pending" options={{ title: 'Web orders' }} />
            <Stack.Screen name="new-sale" options={{ title: 'New sale' }} />
            <Stack.Screen name="sales" options={{ title: "Today's sales" }} />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
