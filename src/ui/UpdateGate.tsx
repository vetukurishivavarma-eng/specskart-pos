import Constants from 'expo-constants'
import { useQuery } from '@tanstack/react-query'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'
import { api } from '../lib/api'
import { VersionInfo } from '../lib/pos'
import { colors, font, spacing } from '../theme'
import { Button, Icon } from './components'

const CURRENT_BUILD = Constants.expoConfig?.android?.versionCode ?? 1

/** Blocks the app behind a full-screen wall when the till is running a build below the
 *  server's minimumBuild. A merely-newer optional release is not surfaced here — nothing
 *  in the app currently nags about optional updates, only enforces mandatory ones. */
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['app-version'],
    queryFn: async () => (await api.get<VersionInfo>('/public/app/version', { params: { platform: Platform.OS } })).data,
    staleTime: 5 * 60_000,
    retry: false,
  })

  if (data && data.mandatory && CURRENT_BUILD < data.minimumBuild) {
    return (
      <View style={styles.root}>
        <Icon name="download" size={40} color={colors.primary} />
        <Text style={styles.title}>Update required</Text>
        <Text style={styles.body}>
          This till is on an old build. Install version {data.version} to keep using Specskart POS.
        </Text>
        {!!data.notes && <Text style={styles.notes}>{data.notes}</Text>}
        {!!data.downloadUrl && (
          <Button label="Download update" onPress={() => Linking.openURL(data.downloadUrl)} style={{ marginTop: spacing.lg }} />
        )}
      </View>
    )
  }
  return <>{children}</>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: font.bold, fontSize: 20, color: colors.text, marginTop: spacing.sm },
  body: { fontFamily: font.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  notes: { fontFamily: font.regular, fontSize: 13, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xs },
})
