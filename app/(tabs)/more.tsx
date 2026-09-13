import { useRouter } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useActiveStore } from '../../src/lib/activeStore'
import { useAuth } from '../../src/lib/auth'
import { spacing } from '../../src/theme'
import { Button, Card, ListRow, RowDivider, SectionLabel, Subtitle, Title } from '../../src/ui/components'

export default function More() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const store = useActiveStore((s) => s.store)

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Title>More</Title>
      <Subtitle>{user?.name ?? user?.email} — {store?.name ?? 'No shop selected'}</Subtitle>

      <View>
        <SectionLabel>Lens business</SectionLabel>
        <Card>
          <ListRow icon="inbox" title="Web orders" subtitle="Verified online, awaiting pickup" onPress={() => router.push('/orders')} />
          <RowDivider />
          <ListRow icon="tag" title="Lens pricing" subtitle="Edit prices & stock flags" onPress={() => router.push('/pricing')} />
        </Card>
      </View>

      <View>
        <SectionLabel>Account</SectionLabel>
        <Card>
          <ListRow icon="home" title="Switch shop" subtitle={store?.name ?? 'Pick a shop'} onPress={() => router.push('/store-picker')} />
          <RowDivider />
          <ListRow icon="smartphone" title="My devices" onPress={() => router.push('/devices')} />
        </Card>
      </View>

      <Button label="Sign out" variant="ghost" onPress={() => logout()} />
    </ScrollView>
  )
}
