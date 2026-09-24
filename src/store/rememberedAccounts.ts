import * as SecureStore from 'expo-secure-store'

/**
 * Logins saved on this device so staff can tap a name instead of typing. Ported from NG POS.
 *
 * The password is kept here in the platform keystore — the same store as the auth token, and
 * excluded from cloud backup. This is a deliberate trade for a shared till with quick shift
 * changes, against the usual objections: a saved password outlives a remote "remove this
 * device", and the audit log names whichever account was tapped. Two things keep it honest:
 *
 *  - a saved login the server rejects (password changed, account deactivated) is forgotten on
 *    the spot — see the `forgetAccount` call in the sign-in flow;
 *  - nothing is saved unless the person ticks the box.
 */
const KEY = 'specskart_remembered_accounts'
const MAX = 6

export interface RememberedAccount {
  email: string
  password: string
  name: string
  role: string
}

export async function listRememberedAccounts(): Promise<RememberedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is RememberedAccount =>
        a && typeof a.email === 'string' && typeof a.password === 'string'
    )
  } catch {
    return []
  }
}

async function write(accounts: RememberedAccount[]): Promise<void> {
  try {
    if (accounts.length === 0) await SecureStore.deleteItemAsync(KEY)
    else await SecureStore.setItemAsync(KEY, JSON.stringify(accounts.slice(0, MAX)))
  } catch {
    // Keystore unavailable — the picker just won't have this entry next time.
  }
}

/** Adds or refreshes one login. Most-recently-used first. */
export async function rememberAccount(account: RememberedAccount): Promise<void> {
  const email = account.email.trim().toLowerCase()
  const existing = await listRememberedAccounts()
  await write([{ ...account, email }, ...existing.filter((a) => a.email.toLowerCase() !== email)])
}

export async function forgetAccount(email: string): Promise<void> {
  const target = email.trim().toLowerCase()
  const existing = await listRememberedAccounts()
  await write(existing.filter((a) => a.email.toLowerCase() !== target))
}

/** Two letters for the picker's avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
