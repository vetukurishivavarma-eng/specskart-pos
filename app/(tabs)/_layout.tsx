import { Tabs } from 'expo-router'
import { type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font } from '../../src/theme'
import { Icon, type IconName } from '../../src/ui/components'

function tabIcon(name: IconName) {
  return ({ color }: { color: ColorValue }) => <Icon name={name} size={21} color={color as string} />
}

const TAB_CONTENT_HEIGHT = 56

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, 10)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          height: TAB_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Sell', tabBarIcon: tabIcon('shopping-bag') }} />
      <Tabs.Screen name="orders" options={{ title: 'Web orders', tabBarIcon: tabIcon('inbox') }} />
      <Tabs.Screen name="pricing" options={{ title: 'Pricing', tabBarIcon: tabIcon('tag') }} />
      <Tabs.Screen name="reports" options={{ title: 'Sales', tabBarIcon: tabIcon('bar-chart-2') }} />
    </Tabs>
  )
}
