/**
 * Visual language for Specskart POS — same structure/tokens as NG POS's theme
 * (colors/font/spacing/radius/shadow/bevel/motion + the same component kit reads
 * off these names), recoloured to Specskart's own identity instead of borrowing
 * another client's brand. Palette matches the web frontend's Tailwind tokens
 * (frontend/tailwind.config.js: ink/bone/clay/moss) so the two feel like one product.
 */

export const colors = {
  // Clay — primary actions and active state. This was near-black ink until the accent was
  // promoted: a till full of black buttons read as a form to fill in rather than a thing to
  // use, and the brand already owned a warmer colour that was being spent on almost nothing.
  // Text stays ink (see `text`/`ink` below) — only the things you press are clay.
  primary: '#b4552d',
  // The dark wash behind the login and lock screens. Deliberately still near-black: it is a
  // backdrop, not an action, and a full-bleed terracotta field is a lot of colour.
  primaryDeep: '#0a0908',
  primaryBright: '#2a2622',
  primarySoft: '#f5e3da',

  // Clay — the accent. Used sparingly: totals, highlights, warnings.
  accent: '#b4552d',
  accentDeep: '#8f4223',
  accentSoft: '#f5e3da',

  /** The card the wordmark sits on, and the adaptive icon's background. */
  brandCard: '#f6f3ee',

  // Bone paper neutrals.
  canvas: '#f6f3ee',
  surface: '#FFFFFF',
  surfaceSunken: '#ece8e1',
  border: '#e2ddd3',
  borderStrong: '#cec6b7',

  // Moss-tinted near-black text, so text sits in the same family as the brand.
  ink: '#14110f',
  text: '#1c1a17',
  textMuted: '#6f6a61',
  textFaint: '#9c968a',
  onDark: '#f6f3ee',
  onDarkMuted: '#b8b2a6',

  danger: '#c0442c',
  dangerSoft: '#fae7e2',
  success: '#3f4a3c',
  successSoft: '#e3e7e1',
  warning: '#8f4223',
  warningSoft: '#f5e3da',
  info: '#3f4a3c',
  infoSoft: '#e3e7e1',
} as const;

export const font = {
  regular: 'Jakarta_400Regular',
  medium: 'Jakarta_500Medium',
  semibold: 'Jakarta_600SemiBold',
  bold: 'Jakarta_700Bold',
  extrabold: 'Jakarta_800ExtraBold',
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

export const shadow = {
  card: {
    shadowColor: '#141110',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0a0908',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tile: {
    shadowColor: '#0a0908',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  sunken: {
    shadowColor: '#0a0908',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;

export const bevel = {
  light: {
    borderTopColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomColor: '#DFD8CA',
    borderBottomWidth: 1.5,
  },
  dark: {
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderTopWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.22)',
    borderBottomWidth: 1.5,
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
