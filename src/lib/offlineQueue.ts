import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { api } from './api'

/**
 * A queue for the one thing that must never be lost with no signal: a completed sale.
 *
 * ponytail: this is deliberately NOT NG POS's full offline-first architecture (a local SQLite
 * mirror of the catalog/stock so the app can keep reading and selling while fully offline, with
 * conflict resolution when it reconnects). That is a much bigger, separate project. This queue
 * only covers the write side — a sale rung up with no signal is queued locally and replayed
 * automatically once connectivity returns, using the same clientReference idempotency key the
 * backend already enforces (see SaleService.createSale), so a retry can't double-sell. Browsing
 * stock/prices still requires a live connection.
 */
const QUEUE_KEY = 'specskart_pos_offline_sale_queue'

export type QueuedSale = { endpoint: string; body: unknown; clientReference: string; queuedAt: string }

async function readQueue(): Promise<QueuedSale[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

async function writeQueue(queue: QueuedSale[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function enqueueSale(endpoint: string, body: unknown, clientReference: string) {
  const queue = await readQueue()
  queue.push({ endpoint, body, clientReference, queuedAt: new Date().toISOString() })
  await writeQueue(queue)
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length
}

/** True for a dropped connection / timeout — the case worth queuing. A real validation error
 *  (bad request, insufficient stock) has a response and should surface to the cashier instead. */
export function isNetworkError(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'response' in err === false
}

let flushing = false

/** Replays queued sales in order, oldest first. Stops at the first one that still fails with a
 *  network error (nothing after it could have gone through either); a queued sale that now
 *  fails for a real reason (e.g. the item's since sold out elsewhere) is dropped rather than
 *  stuck forever — logged, not silently lost, but this app has no queued-sale review screen
 *  yet to surface that failure to staff. */
export async function flushQueue(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    let queue = await readQueue()
    while (queue.length > 0) {
      const [next, ...rest] = queue
      try {
        await api.post(next.endpoint, next.body)
        queue = rest
        await writeQueue(queue)
      } catch (err) {
        if (isNetworkError(err)) return // still offline, try again next time
        console.warn('[offlineQueue] dropping a queued sale that failed for real:', next, err)
        queue = rest
        await writeQueue(queue)
      }
    }
  } finally {
    flushing = false
  }
}

/** Call once from the root layout: flushes on reconnect and does one attempt at startup. */
export function startOfflineQueueWatcher() {
  void flushQueue()
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) void flushQueue()
  })
}
