import { useLocalSearchParams } from 'expo-router'

/**
 * A staff WhatsApp alert links to one order, and the app opens the screen that order lives on.
 * That screen is still a list, so this floats the linked row to the top rather than filtering
 * the rest away — the packer usually has other orders to deal with in the same trip.
 *
 * `missing` is the case worth saying out loud: the id is real but this list doesn't hold it,
 * because it's already been dealt with or belongs to another shop. Silently showing the normal
 * list there reads as "the link is broken".
 */
export function useLinkedRow<T extends { id: string }>(rows: T[] | undefined) {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const list = rows ?? []
  if (!id) return { list, linkedId: null, missing: false }
  const hit = list.find((r) => r.id === id)
  return {
    list: hit ? [hit, ...list.filter((r) => r !== hit)] : list,
    linkedId: id,
    missing: !hit,
  }
}
