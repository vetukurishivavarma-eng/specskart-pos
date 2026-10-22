import { Directory, File, Paths } from 'expo-file-system'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, font, radius, spacing } from '../theme'

/** Customer media lives behind our login, so it's downloaded to the cache first and shown/opened from there.
 *  name: a fixed cache filename, for URLs whose last segment isn't unique (e.g. .../photo). */
export async function downloadMedia(uri: string, token: string | null, name?: string) {
  const dir = new Directory(Paths.cache, 'chat-media')
  if (!dir.exists) dir.create()
  return File.downloadFileAsync(uri, name ? new File(dir, name) : dir, { headers: { Authorization: `Bearer ${token}` }, idempotent: true })
}

/** A photo behind our login: a loading box, then the photo -- or a visible error with retry, never a silent grey box. */
export function AuthedPhoto({ uri, token, name, size = 220, onOpen }: {
  uri: string; token: string | null; name?: string; size?: number; onOpen: (local: string) => void
}) {
  const [local, setLocal] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const box = { width: size, height: size }

  useEffect(() => {
    let live = true
    setFailed(false)
    downloadMedia(uri, token, name)
      .then((f) => { if (live) setLocal(f.uri) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [uri, token, name, attempt])

  if (failed) {
    return (
      <Pressable style={[styles.photo, box, styles.photoMsg]} onPress={() => setAttempt((a) => a + 1)}>
        <Text style={styles.muted}>Couldn't load this photo. Tap to try again.</Text>
      </Pressable>
    )
  }
  if (!local) return <View style={[styles.photo, box, styles.photoMsg]}><ActivityIndicator color={colors.textMuted} /></View>
  return (
    <Pressable onPress={() => onOpen(local)}>
      <Image source={{ uri: local }} style={[styles.photo, box]} resizeMode="cover" onError={() => setFailed(true)} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  photo: { borderRadius: radius.md, backgroundColor: colors.border },
  photoMsg: { alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  muted: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
})
