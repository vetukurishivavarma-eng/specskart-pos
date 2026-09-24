import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { canInstallInApp, openInstallPermissionSettings } from '../lib/apkInstaller'
import { installedVersion, shouldAutoDownload, useAppUpdate, updateGateVisible } from '../store/appUpdate'
import { colors, font, radius, spacing } from '../theme'
import { Icon } from './components'

function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * The update prompt, and — when the postponements are spent — the wall.
 *
 * Rendered over the navigator by the root layout rather than as a route, so a back gesture has
 * no navigation state to unwind to reach the app underneath. When the update is compulsory
 * there is no dismissal on screen at all: the only way past is to install the build.
 *
 * The two states are one screen in a different tone rather than two components, because they
 * are the same fact told twice — the second time without a choice.
 */
export function UpdateGate({ children }: { children: React.ReactNode }) {
  const visible = useAppUpdate(updateGateVisible)
  const check = useAppUpdate((s) => s.check)

  useEffect(() => {
    void check()
  }, [check])

  return (
    <>
      {children}
      {visible ? <UpdatePrompt /> : null}
    </>
  )
}

function UpdatePrompt() {
  const status = useAppUpdate((s) => s.status)
  const release = useAppUpdate((s) => s.release)
  const skipsUsed = useAppUpdate((s) => s.skipsUsed)
  const graceCount = useAppUpdate((s) => s.graceCount)
  const postpone = useAppUpdate((s) => s.postpone)
  const install = useAppUpdate((s) => s.install)
  const metered = useAppUpdate((s) => s.metered)
  const installUpdate = useAppUpdate((s) => s.installUpdate)
  const cancelInstall = useAppUpdate((s) => s.cancelInstall)
  const autoStart = useAppUpdate(shouldAutoDownload)

  const [browserOpening, setBrowserOpening] = useState(false)
  const [browserFailed, setBrowserFailed] = useState(false)

  /**
   * Start fetching as soon as the gate appears, on a connection where that is free. By the
   * time the notes have been read the APK is usually down and the only thing left is Android's
   * own confirmation — which is the whole of what "automatic" can mean without enrolling the
   * handset.
   */
  useEffect(() => {
    if (autoStart) void installUpdate()
  }, [autoStart, installUpdate])

  if (!release) return null

  const required = status === 'required'
  const remaining = Math.max(0, graceCount - skipsUsed)
  const busy = install.kind === 'downloading' || install.kind === 'handedOff'

  async function openInBrowser() {
    setBrowserOpening(true)
    setBrowserFailed(false)
    try {
      await Linking.openURL(release!.downloadUrl)
    } catch {
      // No browser, or a link nothing can handle. Show the address so the shop can type it on
      // another device rather than being left at a dead end.
      setBrowserFailed(true)
    } finally {
      setBrowserOpening(false)
    }
  }

  return (
    <SafeAreaView style={styles.backdrop}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.card}>
          <View style={[styles.crest, required && styles.crestRequired]}>
            <Icon
              name={required ? 'alert-triangle' : 'download-cloud'}
              size={26}
              color={required ? colors.danger : colors.primary}
            />
          </View>

          <Text style={styles.title}>{required ? 'Update required' : 'A new version is ready'}</Text>

          <Text style={styles.lead}>
            {required
              ? 'This version of Specskart POS is out of date and can no longer be used. Install the update to carry on.'
              : `Specskart POS ${release.version} is available. Installing it now takes a minute.`}
          </Text>

          <View style={styles.versions}>
            <View style={styles.versionSide}>
              <Text style={styles.versionLabel}>Installed</Text>
              <Text style={styles.versionValue}>{installedVersion() || '—'}</Text>
            </View>
            <Icon name="arrow-right" size={16} color={colors.textFaint} />
            <View style={styles.versionSide}>
              <Text style={styles.versionLabel}>Available</Text>
              <Text style={[styles.versionValue, styles.versionNew]}>{release.version}</Text>
            </View>
          </View>

          {release.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesLabel}>What&apos;s new</Text>
              <Text style={styles.notesBody}>{release.notes}</Text>
            </View>
          ) : null}

          {install.kind === 'downloading' ? (
            <Downloading
              received={install.received}
              total={install.total}
              attempt={install.attempt}
              onCancel={cancelInstall}
            />
          ) : install.kind === 'handedOff' ? (
            <View style={styles.waiting}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.waitingLabel}>Downloaded. Confirm the install when Android asks.</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
              onPress={canInstallInApp ? () => void installUpdate() : () => void openInBrowser()}
              disabled={browserOpening}
            >
              <Icon name={install.kind === 'staged' ? 'check-circle' : 'download'} size={18} color={colors.surface} />
              <Text style={styles.primaryLabel}>
                {browserOpening
                  ? 'Opening…'
                  : install.kind === 'staged'
                    ? 'Install now'
                    : install.kind === 'failed'
                      ? 'Try again'
                      : 'Update now'}
              </Text>
            </Pressable>
          )}

          {/* Said only when it is about to cost them something. On wi-fi the download has
              already started and there is nothing to warn about. */}
          {canInstallInApp && metered && install.kind === 'idle' ? (
            <Text style={styles.note}>
              You are on mobile data, so this was not downloaded automatically. Tap to download it now, or
              wait until you are on wi-fi.
            </Text>
          ) : null}

          {/* Backing out of Android's dialog and being blocked by it look identical from here,
              and the second is the likelier the first time an update is installed this way. So
              the permission is offered on both, worded as the possibility it is. */}
          {install.kind === 'staged' ? (
            <View style={styles.pending}>
              <Text style={styles.pendingText}>The update is downloaded but not installed yet.</Text>
              <Pressable onPress={() => void openInstallPermissionSettings()}>
                <Text style={styles.link}>If Android would not let it install, allow installs from Specskart POS</Text>
              </Pressable>
            </View>
          ) : null}

          {install.kind === 'failed' ? (
            <View style={styles.problem}>
              <Text style={styles.problemText}>{install.reason}</Text>
              <Pressable onPress={() => void openInstallPermissionSettings()}>
                <Text style={styles.link}>If Android blocked the install, allow installs from Specskart POS</Text>
              </Pressable>
              {install.offerBrowser ? (
                <Pressable onPress={() => void openInBrowser()}>
                  <Text style={styles.link}>Download it in the browser instead</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {browserFailed ? (
            <Text style={styles.fallback} selectable>
              Could not open the link. Download it from:{'\n'}
              {release.downloadUrl}
            </Text>
          ) : null}

          {required ? (
            <Text style={styles.locked}>
              {skipsUsed > 0
                ? 'This update has already been postponed as many times as allowed.'
                : 'This update cannot be postponed.'}
            </Text>
          ) : busy ? null : (
            // Hidden while the APK is coming down, because "Later" there would dismiss the
            // screen and leave the transfer running out of sight — spending both a
            // postponement and the shop's data for nothing.
            <>
              <Pressable
                style={({ pressed }) => [styles.later, pressed && styles.laterPressed]}
                onPress={() => void postpone()}
              >
                <Text style={styles.laterLabel}>Later</Text>
              </Pressable>
              {/* Said plainly, and before the last one is spent. Somebody who finds out the app
                  has locked at the start of a shift, with no warning it would, is right to be
                  angry about it. */}
              <Text style={styles.remaining}>
                {remaining === 1
                  ? 'You can postpone once more. After that the update is required.'
                  : `You can postpone ${remaining} more times.`}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * The transfer, with a way out of it.
 *
 * `total` is -1 when the server sent no Content-Length, which some file hosts do not. There is
 * no percentage to show then, so it shows what has arrived rather than a bar inventing its own
 * position.
 */
function Downloading({
  received,
  total,
  attempt,
  onCancel,
}: {
  received: number
  total: number
  attempt: number
  onCancel: () => void
}) {
  // Nothing has arrived yet, so this is the connection being made, not a transfer sitting at
  // zero. Saying "Downloading" here is what makes a slow connect look like a hang.
  const connecting = received <= 0
  const known = total > 0
  const fraction = known ? Math.min(1, received / total) : 0

  // A connect taking unusually long gets an explanation rather than more silence. Deliberately
  // shorter than the abort in apkInstaller, so the user is told it is slow before anything
  // decides to start over.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!connecting) {
      setSlow(false)
      return
    }
    const timer = setTimeout(() => setSlow(true), 20_000)
    return () => clearTimeout(timer)
    // `attempt` restarts the clock: a retry deserves its own 20 seconds before being called slow.
  }, [connecting, attempt])

  return (
    <View>
      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>
          {connecting ? (attempt > 1 ? 'Trying a new connection' : 'Connecting') : 'Downloading the update'}
        </Text>
        <Text style={styles.progressValue}>
          {connecting ? '' : known ? `${Math.round(fraction * 100)}%` : megabytes(received)}
        </Text>
      </View>

      <View style={styles.track}>
        {known && !connecting ? (
          <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
        ) : (
          <View style={styles.indeterminate} />
        )}
      </View>

      {connecting && slow ? (
        <Text style={styles.note}>Still connecting. If this does not get going, a new connection is tried.</Text>
      ) : null}

      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.link}>Cancel</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  crest: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    marginBottom: spacing.xs,
  },
  crestRequired: { backgroundColor: colors.dangerSoft },
  title: { fontFamily: font.bold, fontSize: 20, color: colors.text },
  lead: { fontFamily: font.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  versions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  versionSide: { gap: 2 },
  versionLabel: {
    fontFamily: font.medium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textFaint,
  },
  versionValue: { fontFamily: font.bold, fontSize: 16, color: colors.textMuted },
  versionNew: { color: colors.text },
  notes: { gap: 4, marginTop: spacing.xs },
  notesLabel: {
    fontFamily: font.medium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textFaint,
  },
  notesBody: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  primaryPressed: { opacity: 0.85 },
  primaryLabel: { fontFamily: font.bold, fontSize: 15, color: colors.surface },
  later: { alignItems: 'center', paddingVertical: spacing.sm },
  laterPressed: { opacity: 0.6 },
  laterLabel: { fontFamily: font.medium, fontSize: 14, color: colors.textMuted },
  remaining: { fontFamily: font.regular, fontSize: 12, color: colors.textFaint, textAlign: 'center' },
  locked: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.textFaint, marginTop: spacing.xs, lineHeight: 17 },
  link: { fontFamily: font.medium, fontSize: 13, color: colors.primary, textDecorationLine: 'underline' },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  waitingLabel: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted, flex: 1 },
  pending: { gap: spacing.xs, marginTop: spacing.sm },
  pendingText: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },
  problem: { gap: spacing.xs, marginTop: spacing.sm },
  problemText: { fontFamily: font.medium, fontSize: 13, color: colors.danger },
  fallback: { fontFamily: font.regular, fontSize: 12, color: colors.textFaint, marginTop: spacing.xs },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.xs },
  progressLabel: { fontFamily: font.medium, fontSize: 13, color: colors.text },
  progressValue: { fontFamily: font.bold, fontSize: 13, color: colors.textMuted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.canvas, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  indeterminate: { height: 6, width: '35%', borderRadius: 3, backgroundColor: colors.borderStrong },
  cancel: { alignItems: 'center', paddingVertical: spacing.sm },
})
