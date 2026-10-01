/**
 * Visual language for Specskart POS (2026-10 rebrand): cobalt + navy-ink + coral, lime glint,
 * Bricolage Grotesque headings over Plus Jakarta body. Matches the web's Tailwind tokens
 * (frontend/tailwind.config.js) so the two feel like one product.
 */

export const colors = {
  // Optic Cobalt -- the one colour you press. Electric enough to read as a modern optical
  // brand rather than a craft-paper template; text never uses it.
  primary: '#2342F0',
  // Navy-black backdrop behind login and lock.
  primaryDeep: '#0A0F1F',
  primaryBright: '#1A2340',
  primarySoft: '#E7EBFF',

  // Coral -- the second voice, spent on totals and highlights only.
  accent: '#E8492E',
  accentDeep: '#C23A22',
  accentBright: '#FF7A5C',
  accentSoft: '#FFEBE5',

  // Lime "lens glint" from the logo. Only ever on dark or cobalt surfaces -- it disappears on white.
  signal: '#C8F04B',

  cool: '#33415C',
  coolSoft: '#E8ECF3',

  /** The tile the mark sits on, and the adaptive icon's background. */
  brandCard: '#2342F0',

  // Cool neutrals: hairline-bordered white cards on a barely-grey canvas.
  canvas: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceSunken: '#ECEEF2',
  border: '#E3E6EB',
  borderStrong: '#CDD2DA',

  ink: '#0A0F1F',
  text: '#121826',
  textMuted: '#5B6475',
  textFaint: '#9AA1AE',
  onDark: '#F4F6FF',
  onDarkMuted: '#A9B1C6',

  danger: '#D92D20',
  dangerSoft: '#FDECEA',
  success: '#12805C',
  successSoft: '#E3F5EE',
  warning: '#B54708',
  warningSoft: '#FEF0E1',
  info: '#2342F0',
  infoSoft: '#E7EBFF',
} as const;

export const font = {
  regular: 'Jakarta_400Regular',
  medium: 'Jakarta_500Medium',
  semibold: 'Jakarta_600SemiBold',
  bold: 'Jakarta_700Bold',
  extrabold: 'Jakarta_800ExtraBold',
  // Headings, totals and the wordmark -- a grotesque with some character, so screens don't
  // look like every other template.
  display: 'Bricolage_700Bold',
  displayHeavy: 'Bricolage_800ExtraBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

// Flat and crisp: one hairline + a whisper of shadow. The old bevels/drop-shadows made every
// card look like a plastic key.
export const shadow = {
  card: {
    shadowColor: '#0A0F1F',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: '#0A0F1F',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tile: {
    shadowColor: '#0A0F1F',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  sunken: {
    shadowColor: '#0A0F1F',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
} as const;

/** Kept as names so the component kit still reads them; now just even hairlines. */
export const bevel = {
  light: {
    borderTopColor: '#E3E6EB',
    borderTopWidth: 1,
    borderBottomColor: '#E3E6EB',
    borderBottomWidth: 1,
  },
  dark: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
} as const;

export const motion = {
  instant: 90,
  quick: 160,
  travel: 460,
  spring: { damping: 15, stiffness: 220, mass: 0.7 },
} as const;

/** Zambian Kwacha, e.g. `K1,234.00`. */
export function formatKwacha(amountMinor: number | null | undefined): string {
  const n = Number(amountMinor ?? 0) / 100;
  const sign = n < 0 ? '-' : '';
  return `${sign}K${Math.abs(n).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
