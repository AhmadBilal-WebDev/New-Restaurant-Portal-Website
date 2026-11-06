/**
 * ============================================================
 * SINGLE SOURCE OF TRUTH — all brand & admin colors live HERE.
 * Change a value once; CSS variables + JS theme both update.
 * ============================================================
 */

export const colors = {
  /* Storefront brand */
  primary: '#E51B23',
  primaryDeep: '#B90F16',
  warmCream: '#FFF9EF',
  softCream: '#F7F1E7',
  pageBg: '#FAF5ED',
  charcoal: '#191919',
  golden: '#F5B82E',
  warmOrange: '#F47B20',

  /* Admin accent (RestaurantOS) */
  adminAccent: '#FF5A1F',
  adminAccentHover: '#E04810',
  adminAccentAlt: '#E85A2D',

  /* Admin dark surfaces — black bg + white text */
  adminDarkBg: '#000000',
  adminDarkSurface: '#0D0F12',
  adminDarkElevated: '#14161B',
  adminDarkInput: '#101216',
  adminDarkHover: '#1A1D24',
  adminDarkBorder: '#292D35',
  adminDarkText: '#FFFFFF',
  adminDarkMuted: '#D4D4D4',
  adminDarkSubtle: '#A3A3A3',
  adminDarkFaint: '#737373',

  /* Admin light surfaces — white bg + black text */
  adminLightBg: '#FFFFFF',
  adminLightSurface: '#FFFFFF',
  adminLightElevated: '#FFFFFF',
  adminLightInput: '#F4F6FA',
  adminLightHover: '#F3F4F6',
  adminLightBorder: '#E5E7EB',
  adminLightText: '#000000',
  adminLightMuted: '#1F2937',
  adminLightSubtle: '#374151',
  adminLightFaint: '#6B7280',

  /* Status */
  success: '#00D084',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

/** Default restaurantConfig.theme values — keep in sync via this export */
export const restaurantTheme = {
  primaryColor: colors.adminAccent,
  primaryHover: colors.adminAccentHover,
  accentColor: colors.golden,
  darkBg: '#090A0C',
  darkCard: colors.adminDarkElevated,
  darkBorder: colors.adminDarkBorder,
  lightBg: colors.warmCream,
  lightCard: '#FFFFFF',
};

/**
 * CSS custom properties injected once in root layout.
 * Edit `colors` above — never scatter hex values across components when possible.
 */
export function buildThemeCss() {
  const c = colors;
  return `
:root {
  --color-primary-red: ${c.primary};
  --color-deep-red: ${c.primaryDeep};
  --color-warm-cream: ${c.warmCream};
  --color-soft-cream: ${c.softCream};
  --color-charcoal: ${c.charcoal};
  --color-golden-yellow: ${c.golden};
  --color-warm-orange: ${c.warmOrange};
  --color-page-bg: ${c.pageBg};
  --color-admin-accent: ${c.adminAccent};
  --color-admin-accent-hover: ${c.adminAccentHover};
  --color-admin-accent-alt: ${c.adminAccentAlt};
  --font-display: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

[data-admin-theme='dark'] {
  color-scheme: dark;
  --admin-bg: ${c.adminDarkBg};
  --admin-surface: ${c.adminDarkSurface};
  --admin-elevated: ${c.adminDarkElevated};
  --admin-input: ${c.adminDarkInput};
  --admin-hover: ${c.adminDarkHover};
  --admin-border: ${c.adminDarkBorder};
  --admin-text: ${c.adminDarkText};
  --admin-muted: ${c.adminDarkMuted};
  --admin-subtle: ${c.adminDarkSubtle};
  --admin-faint: ${c.adminDarkFaint};
  background-color: var(--admin-bg);
  color: var(--admin-text);
}

[data-admin-theme='light'] {
  color-scheme: light;
  --admin-bg: ${c.adminLightBg};
  --admin-surface: ${c.adminLightSurface};
  --admin-elevated: ${c.adminLightElevated};
  --admin-input: ${c.adminLightInput};
  --admin-hover: ${c.adminLightHover};
  --admin-border: ${c.adminLightBorder};
  --admin-text: ${c.adminLightText};
  --admin-muted: ${c.adminLightMuted};
  --admin-subtle: ${c.adminLightSubtle};
  --admin-faint: ${c.adminLightFaint};
  background-color: var(--admin-bg) !important;
  color: var(--admin-text);
}
`.trim();
}
