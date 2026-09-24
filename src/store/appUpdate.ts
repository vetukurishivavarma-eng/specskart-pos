import NetInfo from '@react-native-community/netinfo'
import Constants from 'expo-constants'
import type { File } from 'expo-file-system'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { create } from 'zustand'

import { api } from '../lib/api'
import {
  canInstallInApp,
  downloadApk,
  InstallError,
  launchInstaller,
  type DownloadHandle,
} from '../lib/apkInstaller'
import type { VersionInfo } from '../lib/pos'

/**
 * Keeping the shop on a current build. Ported from NG POS, which has run this for months.
 *
 * The rule: when the app opens it asks the server what the current build is. If there is a
 * newer one it says so and offers "Later". "Later" works twice. The third time the same
 * update is offered there is no "Later" — nobody gets past the prompt until it is installed.
 *
 * Three deliberate decisions inside that:
 *
 *  - **The count is per build, not global.** Postponing 1.7.0 twice must not make 1.8.0
 *    compulsory the first time it appears. A new build starts with a fresh two.
 *  - **A failed check never blocks.** A till on a dead connection, or a server asleep, must
 *    still sell — being unable to *ask* whether the app is current is not evidence that it
 *    is not. This backend sleeps on the free tier and takes minutes to wake, so a check that
 *    blocked on failure would shut every shop every morning.
 *  - **The count lives on the handset, the policy on the server.** The prompt has to work
 *    offline once shown; but how many times "Later" is allowed comes down with the release,
 *    so a release that must not be postponed can say so without shipping an app to enforce it.
 */

/** Per-build tally of postponements, as `{"8":2}`. */
const SKIPS_KEY = 'specskart.update.skips'

/**
 * How long a successful check stands before the app asks again. The check runs on cold start
 * and whenever the app comes back to the foreground, which on a till is many times an hour.
 */
const RECHECK_AFTER_MS = 30 * 60_000

/** Ceiling on how often a download redraws the gate. ~4 updates a second. */
const PROGRESS_INTERVAL_MS = 250

/** Android's `versionCode` is what the server compares — never the version string, so that
 *  "1.10.0" cannot sort below "1.9.0". */
export function installedBuild(): number | null {
  const code = Constants.expoConfig?.android?.versionCode
  return typeof code === 'number' ? code : null
}

export function installedVersion(): string {
  return Constants.expoConfig?.version ?? ''
}

async function readSkips(): Promise<Record<string, number>> {
  try {
    const raw = await SecureStore.getItemAsync(SKIPS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

async function writeSkips(skips: Record<string, number>): Promise<void> {
  try {
    await SecureStore.setItemAsync(SKIPS_KEY, JSON.stringify(skips))
  } catch {
    // A handset that cannot record the count keeps offering "Later" indefinitely. That is the
    // safe direction to fail: a till that still works, against one locked shut by its own
    // bookkeeping.
  }
}

/**
 * Where the install has got to. Kept apart from `UpdateStatus` on purpose: that answers
 * "should the gate be up", which the server decides, and this answers "what is happening on
 * this handset right now", which nothing outside this run of the app cares about.
 */
export type InstallPhase =
  | { kind: 'idle' }
  /** `received === 0` means nothing has arrived yet, which the gate shows as "Connecting"
   *  rather than a download stuck at zero. `attempt` carries whether this is the retry. */
  | { kind: 'downloading'; received: number; total: number; attempt: number }
  /** Downloaded, verified, on disk, nothing running — reached by backing out of Android's
   *  installer. Distinct from `idle` so "Install" doesn't re-fetch 114 MB, and so the
   *  automatic download (which watches for `idle`) doesn't restart it. */
  | { kind: 'staged' }
  /** Android's installer is on screen. */
  | { kind: 'handedOff' }
  | { kind: 'failed'; reason: string; offerBrowser: boolean }

export type UpdateStatus =
  /** Nothing to say: current, or we could not ask. */
  | 'none'
  /** A newer build exists and "Later" is still available. */
  | 'optional'
  /** Update or stop: the grace is spent, or the release was never optional. */
  | 'required'

interface AppUpdateState {
  status: UpdateStatus
  release: VersionInfo | null
  /** How many times this build has been postponed already. */
  skipsUsed: number
  /** How many are allowed in total, from the server. */
  graceCount: number
  /** Dismissed for this run of the app, having spent one of the skips. */
  postponed: boolean
  checking: boolean
  lastCheckedAt: number | null
  install: InstallPhase
  /** Whether it would be rude to pull 114 MB down this connection. `null` until established,
   *  which is not the same as "not metered" — the auto-download waits for a real answer. */
  metered: boolean | null

  check: (options?: { force?: boolean }) => Promise<void>
  postpone: () => Promise<void>
  installUpdate: () => Promise<void>
  cancelInstall: () => void
  /** Only for the releases screen: forget the tally after a manual install. */
  reset: () => Promise<void>
}

/** The live download, held outside the store — it is a native handle, not state, and putting
 *  it in the store would re-render every subscriber for a value none of them read. */
let inFlight: DownloadHandle | null = null

/** The APK on disk, if one has been fetched and checked this run. */
let staged: { build: number; file: File } | null = null

/** Whether the automatic download has had its turn for this build. Set when a download starts
 *  and cleared only by a new release, so cancelling is a decision that sticks. */
let autoStarted = 0

export const useAppUpdate = create<AppUpdateState>((set, get) => ({
  status: 'none',
  release: null,
  skipsUsed: 0,
  graceCount: 2,
  postponed: false,
  checking: false,
  lastCheckedAt: null,
  install: { kind: 'idle' },
  metered: null,

  check: async ({ force = false } = {}) => {
    const { checking, lastCheckedAt } = get()
    if (checking) return
    if (!force && lastCheckedAt && Date.now() - lastCheckedAt < RECHECK_AFTER_MS) return

    set({ checking: true })
    try {
      const build = installedBuild()
      const { data } = await api.get<VersionInfo>('/public/app/version', {
        params: { platform: Platform.OS, ...(build != null ? { build } : {}) },
      })

      if (!data.updateAvailable) {
        set({
          status: 'none',
          release: null,
          postponed: false,
          install: { kind: 'idle' },
          lastCheckedAt: Date.now(),
        })
        return
      }

      const skips = await readSkips()
      const used = skips[String(data.buildNumber)] ?? 0
      // graceCount comes back as 0 when the server has already decided the update is
      // compulsory — a mandatory release, or a till under the floor.
      const blocked = data.mandatory || used >= data.graceCount

      // A different build is a new offer, and a build that has just become compulsory must
      // reappear whatever was tapped last time. Only "same build, still optional" keeps its
      // dismissal.
      const sameBuild = get().release?.buildNumber === data.buildNumber

      set({
        status: blocked ? 'required' : 'optional',
        release: data,
        skipsUsed: used,
        graceCount: data.graceCount,
        postponed: !blocked && sameBuild && get().postponed,
        // A different build means anything downloaded or failed was about a release nobody is
        // being offered any more.
        install: sameBuild ? get().install : { kind: 'idle' },
        lastCheckedAt: Date.now(),
      })
    } catch {
      // Offline, or the server is asleep. Say nothing and let the till work.
      set({ status: 'none', lastCheckedAt: null })
    } finally {
      set({ checking: false })
    }
  },

  postpone: async () => {
    const { release, skipsUsed } = get()
    if (!release) return

    // Only this build's tally is kept; anything older is a build nobody is being offered.
    await writeSkips({ [String(release.buildNumber)]: skipsUsed + 1 })

    // The status deliberately does NOT harden here. "Later" was tapped, so this time it works
    // — that is what the word means. Spending the second one makes the *third* prompt the
    // wall, and the third prompt is the next check, where `used >= graceCount` resolves.
    set({ skipsUsed: skipsUsed + 1, postponed: true })
  },

  installUpdate: async () => {
    const { release, install } = get()
    if (!release) return
    // Re-entrant by design: the gate autostarts this and the button offers it, and on a slow
    // connection both can happen within the same second.
    if (install.kind === 'downloading' || install.kind === 'handedOff') return

    autoStarted = release.buildNumber

    // Already downloaded and checked, and the installer was backed out of. `exists` is asked
    // rather than assumed because Android can empty the cache directory at any moment.
    let file = staged?.build === release.buildNumber && staged.file.exists ? staged.file : null

    if (!file) {
      staged = null
      set({ install: { kind: 'downloading', received: 0, total: -1, attempt: 1 } })

      // Progress arrives per chunk — hundreds of events a second on a decent link — and each
      // one would be a store write and a re-render on the thread that has to draw them.
      let lastEmit = 0
      let attempt = 1

      try {
        file = await downloadApk(
          release.downloadUrl,
          release.buildNumber,
          (received, total) => {
            // A cancelled transfer can emit one last progress event on its way down; without
            // this it would resurrect the bar over whatever the cancellation just drew.
            if (get().install.kind !== 'downloading') return
            const now = Date.now()
            // Never throttle away the first byte or the last: the first turns "Connecting"
            // into a real transfer, the last leaves the bar full instead of stuck at 97%.
            const isEdge = received === 0 || (total > 0 && received >= total)
            if (!isEdge && now - lastEmit < PROGRESS_INTERVAL_MS) return
            lastEmit = now
            set({ install: { kind: 'downloading', received, total, attempt } })
          },
          (handle) => {
            inFlight = handle
          },
          (nextAttempt) => {
            // A retry starts from nothing, so the bar goes back to "Connecting" rather than
            // sitting at whatever the dead attempt reached.
            attempt = nextAttempt
            lastEmit = 0
            if (get().install.kind !== 'downloading') return
            set({ install: { kind: 'downloading', received: 0, total: -1, attempt } })
          }
        )
      } catch (error) {
        inFlight = null
        // A cancellation is the user's own doing and `cancelInstall` has already redrawn.
        if (get().install.kind !== 'downloading') return

        const known = error instanceof InstallError
        set({
          install: {
            kind: 'failed',
            reason: known
              ? (error as InstallError).message
              : 'The update could not be downloaded. Check the connection and try again.',
            offerBrowser: known ? (error as InstallError).fallbackWorthwhile : true,
          },
        })
        return
      }

      inFlight = null
      staged = { build: release.buildNumber, file }
    }

    set({ install: { kind: 'handedOff' } })

    try {
      await launchInstaller(file)
    } catch {
      // The installer would not open at all — an OEM ROM with it disabled, or no activity able
      // to handle an APK. The file is downloaded and sound, so the browser is worth offering.
      set({
        install: {
          kind: 'failed',
          reason: 'This device would not open the installer.',
          offerBrowser: true,
        },
      })
      return
    }

    // Reaching here means the installer closed without replacing us: cancelled, or blocked
    // because installs from Specskart POS are not permitted yet. The APK is still on disk and
    // still good, so this settles on `staged` — the next tap opens the installer again
    // without a second download.
    set({ install: { kind: 'staged' } })
  },

  cancelInstall: () => {
    inFlight?.cancel()
    inFlight = null
    // `staged` when there is something to install, so cancelling the *dialog* does not throw
    // away a finished download. `build != null` first, or a missing release and a missing
    // `staged` would compare undefined === undefined and dereference the null.
    const build = get().release?.buildNumber
    const ready = build != null && staged?.build === build && staged.file.exists
    set({ install: ready ? { kind: 'staged' } : { kind: 'idle' } })
  },

  reset: async () => {
    await writeSkips({})
    staged = null
    autoStarted = 0
    set({
      skipsUsed: 0,
      postponed: false,
      status: 'none',
      release: null,
      install: { kind: 'idle' },
      lastCheckedAt: null,
    })
  },
}))

/** Keeps `metered` current. Started at module load because the answer is needed the moment the
 *  gate appears — a subscription set up inside the gate would not have heard from NetInfo yet,
 *  and the automatic download would either stall waiting or start on somebody's mobile data. */
NetInfo.addEventListener((state) => {
  useAppUpdate.setState({
    metered: state.type === 'cellular' || state.details?.isConnectionExpensive === true,
  })
})

/**
 * Whether the APK should start downloading on its own — only on a connection that costs the
 * shop nothing. On mobile data the size is put in front of them and they choose, which is the
 * one place in this flow where being automatic would take a decision that is not ours.
 */
export function shouldAutoDownload(state: AppUpdateState): boolean {
  return (
    canInstallInApp &&
    state.install.kind === 'idle' &&
    state.release !== null &&
    state.release.buildNumber !== autoStarted &&
    state.metered === false
  )
}

/** Whether the prompt should be covering the app. `required` ignores `postponed` entirely —
 *  that is the whole point of it. */
export function updateGateVisible(state: AppUpdateState): boolean {
  if (state.status === 'required') return true
  return state.status === 'optional' && !state.postponed
}
