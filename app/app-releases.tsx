import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FlatList, View } from 'react-native'
import { api } from '../src/lib/api'
import { spacing } from '../src/theme'
import { Badge, Button, Card, Field, ListRow, RowDivider, Title, Toggle } from '../src/ui/components'

type Release = {
  id: string
  platform: string
  version: string
  buildNumber: number
  minimumBuild: number
  downloadUrl: string
  notes: string
  mandatory: boolean
}

export default function AppReleases() {
  const qc = useQueryClient()
  const [version, setVersion] = useState('')
  const [buildNumber, setBuildNumber] = useState('')
  const [minimumBuild, setMinimumBuild] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [mandatory, setMandatory] = useState(false)

  const { data } = useQuery({
    queryKey: ['app-releases'],
    queryFn: async () => (await api.get<Release[]>('/admin/pos/releases')).data,
  })

  async function publish() {
    if (!version.trim() || !buildNumber || !downloadUrl.trim()) return
    await api.post('/admin/pos/releases', {
      platform: 'android',
      version: version.trim(),
      buildNumber: Number(buildNumber),
      minimumBuild: Number(minimumBuild || buildNumber),
      downloadUrl: downloadUrl.trim(),
      notes: notes.trim(),
      mandatory,
    })
    setVersion(''); setBuildNumber(''); setMinimumBuild(''); setDownloadUrl(''); setNotes(''); setMandatory(false)
    qc.invalidateQueries({ queryKey: ['app-releases'] })
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: spacing.lg }}
      data={data}
      keyExtractor={(r) => r.id}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md }}>
          <Title>App releases</Title>
          <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
            <Field label="Version (e.g. 1.2.0)" value={version} onChangeText={setVersion} />
            <Field label="Build number" value={buildNumber} onChangeText={setBuildNumber} keyboardType="number-pad" />
            <Field label="Minimum build to still allow" value={minimumBuild} onChangeText={setMinimumBuild} keyboardType="number-pad" />
            <Field label="Download URL (GitHub release APK)" value={downloadUrl} onChangeText={setDownloadUrl} autoCapitalize="none" />
            <Field label="Notes" value={notes} onChangeText={setNotes} />
            <Toggle label="Mandatory (blocks older builds)" value={mandatory} onChange={setMandatory} />
            <Button label="Publish" onPress={publish} disabled={!version.trim() || !buildNumber || !downloadUrl.trim()} />
          </Card>
        </View>
      }
      renderItem={({ item }) => (
        <ListRow
          icon="download"
          title={`v${item.version} · build ${item.buildNumber}`}
          subtitle={`Minimum build ${item.minimumBuild}${item.notes ? ` · ${item.notes}` : ''}`}
          trailing={item.mandatory ? <Badge label="Mandatory" tone="danger" /> : null}
        />
      )}
    />
  )
}
