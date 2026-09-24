import { useRouter } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useActiveStore } from '../../src/lib/activeStore'
import { useAuth } from '../../src/lib/auth'
import { spacing } from '../../src/theme'
import { Button, Card, ListRow, RowDivider, SectionLabel, Subtitle, Title } from '../../src/ui/components'

/**
 * One hue per section of this menu. The screen is a long grey column otherwise -- twenty rows
 * that all look the same, which is exactly when people stop reading and start hunting. The
 * colours carry no meaning beyond "these belong together"; they are tints of the icon tile
 * only, so nothing here competes with a real status colour like danger or success.
 */
const SECTION = {
  customers: '#b4552d', // clay, the brand accent
  lens: '#2f6f6b',      // teal
  products: '#6b4f9e',  // violet
  frames: '#8f6a23',    // amber
  stock: '#3f6b45',     // green
  account: '#5a6472',   // slate
} as const

export default function More() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const store = useActiveStore((s) => s.store)

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Title>More</Title>
      <Subtitle>{user?.name ?? user?.email} — {store?.name ?? 'No shop selected'}</Subtitle>

      <View>
        <SectionLabel>Customers</SectionLabel>
        <Card>
          <ListRow tint={SECTION.customers} icon="user-plus" title="Add walk-in customer" subtitle="Verify their WhatsApp & sign them up for offers" onPress={() => router.push('/walk-in')} />
        </Card>
      </View>

      <View>
        <SectionLabel>Lens business</SectionLabel>
        <Card>
          <ListRow tint={SECTION.lens} icon="inbox" title="Web orders" subtitle="Verified online, awaiting pickup" onPress={() => router.push('/orders')} />
          <RowDivider />
          <ListRow tint={SECTION.lens} icon="tag" title="Lens pricing" subtitle="Edit lens prices" onPress={() => router.push('/pricing')} />
        </Card>
      </View>

      <View>
        <SectionLabel>Products</SectionLabel>
        <Card>
          <ListRow tint={SECTION.products} icon="package" title="Products" subtitle="Add a frame, edit SKU, price, cost & stock" onPress={() => router.push('/products')} />
        </Card>
      </View>

      <View>
        <SectionLabel>Frame business</SectionLabel>
        <Card>
          <ListRow tint={SECTION.frames} icon="truck" title="Suppliers" onPress={() => router.push('/suppliers')} />
          <RowDivider />
          <ListRow tint={SECTION.frames} icon="file-text" title="Supplier invoices" subtitle="Deliveries & what's owed" onPress={() => router.push('/purchases')} />
          <RowDivider />
          <ListRow tint={SECTION.frames} icon="bar-chart-2" title="Day report" subtitle="Today's Z-report" onPress={() => router.push('/day-report')} />
        </Card>
      </View>

      <View>
        <SectionLabel>Sales & stock</SectionLabel>
        <Card>
          <ListRow tint={SECTION.stock} icon="list" title="Sales history" onPress={() => router.push('/sales')} />
          <RowDivider />
          <ListRow tint={SECTION.stock} icon="tag" title="Store pricing" subtitle="Per-shop price overrides" onPress={() => router.push('/store-pricing')} />
          <RowDivider />
          <ListRow tint={SECTION.stock} icon="activity" title="Stock movements" subtitle="Audit trail" onPress={() => router.push('/movements')} />
          <RowDivider />
          <ListRow tint={SECTION.stock} icon="upload" title="Bulk stock upload" subtitle="Paste in counts from a stock-take" onPress={() => router.push('/stock-import')} />
          <RowDivider />
          <ListRow tint={SECTION.stock} icon="alert-triangle" title="Reorder suggestions" onPress={() => router.push('/reorder')} />
          <RowDivider />
          <ListRow tint={SECTION.stock} icon="trending-up" title="Top products" subtitle="Revenue, profit & quantity" onPress={() => router.push('/analytics')} />
        </Card>
      </View>

      <View>
        <SectionLabel>Account</SectionLabel>
        <Card>
          {!user?.storeId && (
            <>
              <ListRow tint={SECTION.account} icon="home" title="Switch shop" subtitle={store?.name ?? 'Pick a shop'} onPress={() => router.push('/store-picker')} />
              <RowDivider />
            </>
          )}
          <ListRow tint={SECTION.account} icon="smartphone" title="My devices" onPress={() => router.push('/devices')} />
          <RowDivider />
          <ListRow tint={SECTION.account} icon="lock" title="Screen lock" onPress={() => router.push('/screen-lock')} />
          <RowDivider />
          <ListRow tint={SECTION.account} icon="bell" title="Day-close reminder" onPress={() => router.push('/reminder')} />
          <RowDivider />
          <ListRow tint={SECTION.account} icon="printer" title="Printing" onPress={() => router.push('/printer')} />
          {user?.role === 'ADMIN' && (
            <>
              <RowDivider />
              <ListRow tint={SECTION.account} icon="users" title="Staff" onPress={() => router.push('/users')} />
              <RowDivider />
              <ListRow tint={SECTION.account} icon="home" title="Shops" subtitle="Add & manage locations" onPress={() => router.push('/shops')} />
              <RowDivider />
              <ListRow tint={SECTION.account} icon="download" title="App releases" subtitle="Publish an update, force older builds off" onPress={() => router.push('/app-releases')} />
              <RowDivider />
              <ListRow tint={SECTION.account} icon="clock" title="History" subtitle="Who changed what, across every shop" onPress={() => router.push('/history')} />
            </>
          )}
        </Card>
      </View>

      <Button label="Sign out" variant="ghost" onPress={() => logout()} />
    </ScrollView>
  )
}
