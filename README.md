# Specskart POS

Staff-facing Android app for counter billing, stock, and lens pricing. No separate backend
or database — it authenticates and calls the same `specskart-api` service the website uses
(`POST /api/auth/login`, same admin/agent accounts).

**Same structure and generic UI kit as NG POS mobile** (`src/theme.ts` design tokens,
`src/ui/components.tsx` — Button/Card/Field/Select/Toggle/ListRow/Badge/QtyStepper/etc. —
ported verbatim since those are client-agnostic), recoloured to Specskart's own
ink/bone/clay/moss identity instead of NG POS's client-specific palette. NG POS's full
feature set is being ported in phases — see below for what's live vs. still to come.

Bottom-tab navigation, 4 tabs:

- **Sell** — a Lens/Frame switch. **Lens**: bill a walk-in directly, no WhatsApp step (lenses
  are made-to-order, no stock to check). **Frame**: search the real catalog (name/SKU/
  barcode), build a cart, checkout against actual per-shop stock — `com.specskart.pos.
  SaleService` on the backend resolves per-store pricing, decrements stock, and refuses to
  oversell.
- **Stock** — per-shop inventory for every frame, with a low-stock badge and a manual
  adjustment control (physical recount corrections).
- **Sales** — today's running total combining lens counter sales, lens web-order pickups,
  and frame POS sales into one feed.
- **More** — Web orders (lens leads verified over WhatsApp, awaiting pickup), Lens pricing
  editor, shop switcher, my devices (one login = one device; release a lost/old one), sign out.

A shop is selected once (`/store-picker`, persisted on-device) and gates Stock/frame Sell/
frame reporting, since nearly everything in the new multi-shop backend is store-scoped.

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

## Full NG POS feature-parity roadmap

The client asked for everything NG POS has, applied to Specskart's (currently hidden) frame
catalog. This is genuinely as large a build as NG POS itself — being tracked in phases rather
than pretending it's all done:

- **Phase 1 (this build): multi-shop stock + real till sales.** Live — see above.
- **Phase 2, not yet built:** supplier + purchase-invoice screens (receiving stock, tracking
  what's owed), transfers between shops. Backend schema exists (`suppliers`,
  `supplier_invoices`, `transfers`, ...); no service logic or screens yet.
- **Phase 3, not yet built:** staff (users) management screen, day-end Z-report / analytics
  screen. Schema for daily reports exists; generation job and screen don't.
- **Phase 4, not yet built:** Bluetooth receipt printing, offline-first sync (local SQLite
  mirror + a queue that survives no signal), screen-lock. Each is a substantial subsystem on
  its own in NG POS, not a quick add-on.

## Not yet built / known gaps

- Not device-tested with the multi-shop/stock/frame-sell screens — never run on a phone yet.
- No offline queue — a sale made with no signal will just fail; this is Phase 4.
- Walk-in lens sales don't capture a prescription (Sph/Cyl/Axis) — only lens type/blue-block/
  add-on — so `specialAxis` is never true for a walk-in. Add an Rx step if the counter needs
  that too.
- Deliberately NOT ported from NG POS's login: remembered-accounts pick-a-name flow and
  "Forgot password?" — both need either local-only storage decisions or backend endpoints
  this app doesn't have yet. Single email/password form only, for now.
