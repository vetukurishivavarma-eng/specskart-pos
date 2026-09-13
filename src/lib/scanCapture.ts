import { create } from 'zustand'

/** Hands a scanned barcode back to whichever screen opened the camera, without
 *  threading it through route params (expo-router params are strings-only and
 *  awkward for a one-shot "last scanned code" handoff). */
export const useScanCapture = create<{ code: string | null; capture: (code: string) => void; consume: () => string | null }>(
  (set, get) => ({
    code: null,
    capture: (code) => set({ code }),
    consume: () => {
      const code = get().code
      set({ code: null })
      return code
    },
  }),
)
