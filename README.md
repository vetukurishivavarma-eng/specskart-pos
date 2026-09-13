# Specskart POS

Staff-facing Android app for counter billing + lens pricing. No separate backend or
database — it authenticates and calls the same `specskart-api` service the website uses
(`POST /api/auth/login`, same admin/agent accounts, `/api/admin/lens-pricing` and
`/api/admin/lens-sales/*`).

**Same structure and generic UI kit as NG POS mobile** (`src/theme.ts` design tokens,
`src/ui/components.tsx` — Button/Card/Field/Select/Toggle/ListRow/Badge/etc. — ported
verbatim since those are client-agnostic, and the login-screen/tab-navigation layout
mirrors NG POS's), recoloured to Specskart's own ink/bone/clay/moss identity instead of
NG POS's client-specific palette. Bottom-tab navigation, 4 tabs:

- **Sell** — bill a walk-in counter customer directly, no WhatsApp verification (staff
  vouches for them in person). Same pricing rules as the website.
- **Web orders** — customers who verified over WhatsApp and finished the online form show
  up here; staff pick a payment method and mark the order sold when handing it over.
- **Pricing** — edit the price and in-stock flag for each lens option (Clear,
  Photochromatic, blue-block, bifocal, progressive). Feeds the online lens configurator's
  quote directly — no redeploy needed to change a price.
- **Sales** — today's running total + every sale (web or walk-in) sold today.

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

## Not yet built / known gaps

- Not device-tested with this UI rework — the pre-rework build did produce a working
  signed APK via CI, but this restyle hasn't been reinstalled on a phone yet.
- No offline queue — a sale made with no signal will just fail; NG POS's offline-first
  sync pattern wasn't ported over since this app is far smaller in scope.
- No multi-shop — `shopName` is a free-text field on the sale, not a real Store model;
  fine while there's one location, revisit if that changes.
- Walk-in sales don't capture a prescription (Sph/Cyl/Axis) — only lens type/blue-block/
  add-on — so `specialAxis` is never true for a walk-in. Add an Rx step if the counter
  needs to check that too.
- Deliberately NOT ported from NG POS's login: remembered-accounts pick-a-name flow and
  "Forgot password?" — both need either local-only storage decisions or backend endpoints
  this app doesn't have yet. Single email/password form only, for now.
- No printer, screen lock, offline sync, or in-app update-gate — all NG POS features tied
  to a till/warehouse operation that doesn't apply to a lens price list + counter sales.
