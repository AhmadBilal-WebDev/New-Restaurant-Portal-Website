import { getOwnerSession } from './ownerSession';

function authHeaders(json = false) {
  const session = getOwnerSession();
  const token =
    session?.token ||
    (typeof window !== 'undefined' ? localStorage.getItem('owner_token') : null);
  return {
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Domain for theme API — matches other restaurant APIs */
export function getThemeDomainUrl() {
  const sessionDomain = getOwnerSession()?.owner?.frontendDomainUrl;
  const configured =
    process.env.NEXT_PUBLIC_RESTAURANT_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    '';
  const browserOrigin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const domain =
    (typeof sessionDomain === 'string' && sessionDomain.trim()) ||
    (typeof configured === 'string' && configured.trim()) ||
    browserOrigin ||
    '';
  return domain.trim().replace(/\/$/, '');
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}

/** Normalize API payload → 'dark' | 'light' | null */
export function parseThemeValue(payload) {
  const record = asRecord(payload);
  const nested = asRecord(record?.data) || asRecord(record?.theme);
  const raw =
    (typeof record?.theme === 'string' && record.theme) ||
    (typeof nested?.theme === 'string' && nested.theme) ||
    (typeof record?.mode === 'string' && record.mode) ||
    (typeof record?.adminTheme === 'string' && record.adminTheme) ||
    (typeof payload === 'string' ? payload : '');

  const theme = String(raw).trim().toLowerCase();
  if (theme === 'dark' || theme === 'light') return theme;
  return null;
}

/**
 * GET /api/restaurant/theme?domain=...
 */
export async function getRestaurantTheme(domain = getThemeDomainUrl()) {
  if (!domain) {
    return { ok: false, theme: null, message: 'Domain is required.' };
  }

  try {
    const query = new URLSearchParams({ domain });
    const response = await fetch(`/api/restaurant/theme?${query.toString()}`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null);
    const theme = parseThemeValue(data);

    if (!response.ok) {
      return {
        ok: false,
        theme,
        message:
          (data && typeof data.message === 'string' && data.message) ||
          'Failed to load theme.',
        data,
      };
    }

    return { ok: true, theme, data };
  } catch (error) {
    return {
      ok: false,
      theme: null,
      message: error instanceof Error ? error.message : 'Theme request failed.',
    };
  }
}

/**
 * PUT /api/restaurant/theme?domain=...
 * Body: { theme: 'dark' | 'light' }
 */
export async function updateRestaurantTheme(
  theme,
  domain = getThemeDomainUrl(),
) {
  const next = String(theme || '')
    .trim()
    .toLowerCase();
  if (next !== 'dark' && next !== 'light') {
    return { ok: false, theme: null, message: 'theme must be dark or light.' };
  }
  if (!domain) {
    return { ok: false, theme: null, message: 'Domain is required.' };
  }

  try {
    const query = new URLSearchParams({ domain });
    const response = await fetch(`/api/restaurant/theme?${query.toString()}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ theme: next }),
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null);
    const saved = parseThemeValue(data) || next;

    if (!response.ok) {
      return {
        ok: false,
        theme: saved,
        message:
          (data && typeof data.message === 'string' && data.message) ||
          'Failed to update theme.',
        data,
      };
    }

    return { ok: true, theme: saved, data };
  } catch (error) {
    return {
      ok: false,
      theme: null,
      message: error instanceof Error ? error.message : 'Theme update failed.',
    };
  }
}
