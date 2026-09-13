# Specskart POS

Staff-facing Android app for counter billing, stock, purchasing, transfers, staff, and
reporting. No separate backend or database — it authenticates and calls the same
`specskart-api` service the website uses (`POST /api/auth/login`, same admin/agent accounts).

**Same structure and generic UI kit as NG POS mobile** (`src/theme.ts` design tokens,
`src/ui/components.tsx` — Button/Card/Field/Select/Toggle/ListRow/Badge/QtyStepper/etc. —
ported verbatim since those are client-agnostic), recoloured to Specskart's own
ink/bone/clay/moss identity instead of NG POS's client-specific palette.

Bottom-tab navigation, 4 tabs:

- **Sell** — a Lens/Frame switch. **Lens**: bill a walk-in directly, no WhatsApp step (lenses
  are made-to-order, no stock to check). **Frame**: search the real catalog (name/SKU/
  barcode), build a cart, checkout against actual per-shop stock — `com.specskart.pos.
  SaleService` on the backend resolves per-store pricing, decrements stock, and refuses to
  oversell. A completed sale offers **Print receipt** (system print dialog — see below); a
  sale attempted with no signal is queued and synced automatically instead of lost.
- **Stock** — per-shop inventory for every frame, with a low-stock badge and a manual
  adjustment control (physical recount corrections).
- **Sales** — today's running total combining lens counter sales, lens web-order pickups,
  and frame POS sales into one feed.
- **More** — Web orders, Lens pricing, **Suppliers**, **Supplier invoices** (record a
  delivery, track what's owed, record payments), **Transfers** (move stock between shops),
  **Day report** (Z-report: gross takings, split by payment method, top sellers),
  **Staff** (admin-only: create/deactivate accounts), shop switcher, my devices, screen
  lock, sign out.

A shop is selected once (`/store-picker`, persisted on-device) and gates every store-scoped
screen, since nearly everything in the backend is store-scoped.

## Setup

```
npm install
npx expo start
```

Points at the live prod API (`https://specskart-api.onrender.com/api`) by default. To point
at a local backend during development, add to `app.json`:

```json
{ "expo": { "extra": { "apiBaseUrl": "http://<your-lan-ip>:8080/api" } } }
```

## Versioning

Independent of NG POS's version numbering — separate repo, separate `app.json`/`package.json`,
starts at `1.0.0` / `versionCode 1`. Bump both on every release the way NG POS does, but never
copy or sync NG POS's version numbers here — they track unrelated release histories.

## Full NG POS feature-parity: all 4 phases built

The client asked for everything NG POS has, applied to Specskart's (currently hidden) frame
catalog.

- **Phase 1: multi-shop stock + real till sales.** Store/ProductInventory/ProductStorePrice,
  device sessions (one login = one device), SaleService (per-store pricing, stock check +
  decrement, receipt numbering, idempotent retries).
- **Phase 2: suppliers + purchase invoices + transfers.** Posting an invoice puts stock on
  the shelf and records the debt in one transaction; part-payments accumulate toward PAID.
  A transfer decrements the source immediately and credits the destination on receipt —
  two movements, so stock isn't double-counted in transit.
- **Phase 3: staff management + day-end reports.** Admin-only account creation/deactivation;
  a Z-report regenerated fresh on every request (gross total, cash/card/mobile split, top 5
  sellers) rather than a scheduled nightly job.
- **Phase 4: screen lock, receipt printing, offline sale queue.** See the honest scoping
  notes below — these are real but deliberately smaller than NG POS's equivalents.

### Phase 4 scoping — what's actually built vs. NG POS's version

- **Screen lock** (`src/lib/screenLock.ts`, `src/ui/LockScreen.tsx`): PIN + optional
  biometric unlock, relocks 2 minutes after backgrounding. Full parity with NG POS's version.
- **Receipt printing** (`src/lib/receipt.ts`): uses `expo-print` — the OS print framework —
  rather than a raw ESC/POS Bluetooth protocol. Works with whatever printer is already
  paired via its own Android print-service app (most thermal receipt printers ship one), but
  there's no in-app printer picker/pairing screen and no manual feed/cut control. If a
  specific printer's print-service is missing, or the shop needs finer control, this would
  need swapping for a dedicated ESC/POS library targeting that printer model.
- **Offline queue** (`src/lib/offlineQueue.ts`): covers the one thing that must never be lost
  with no signal — a completed sale. A sale attempted offline is queued in AsyncStorage and
  replayed automatically on reconnect, using the same clientReference idempotency key the
  backend already enforces (both frame sales and, as of this build, lens walk-in sales) so a
  retry can't double-sell. **This is NOT NG POS's full offline-first architecture** — there's
  no local SQLite mirror of the catalog/stock, so browsing products/prices/stock still
  requires a live connection; only the sale write itself survives being offline.

## Not yet built / known gaps

- Not device-tested — never run on a phone yet, including everything in this build.
- Walk-in lens sales don't capture a prescription (Sph/Cyl/Axis) — only lens type/blue-block/
  add-on — so `specialAxis` is never true for a walk-in. Add an Rx step if the counter needs
  that too.
- Deliberately NOT ported from NG POS's login: remembered-accounts pick-a-name flow and
  "Forgot password?" — both need either local-only storage decisions or backend endpoints
  this app doesn't have yet. Single email/password form only, for now.
- No queued-sale review screen — if a queued offline sale ends up failing for a real reason
  once back online (e.g. the item's since sold out elsewhere), it's dropped with a console
  warning rather than surfaced to staff for review.
- "Pass on" a received transfer (NG POS's transfer-chaining feature via
  `transfers.source_transfer_id`) has the column but no service logic wired to it.
