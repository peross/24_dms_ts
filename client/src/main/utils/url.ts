export function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) {
    return 'http://localhost:3000/api';
  }

  if (trimmed.endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

export function deriveWebAppUrl(apiBaseUrl?: string | null): string | null {
  if (!apiBaseUrl) {
    return null;
  }

  const normalized = normalizeApiBaseUrl(apiBaseUrl);
  if (normalized.endsWith('/api')) {
    return normalized.slice(0, -4);
  }

  return normalized;
}

export function deriveSocketUrl(apiBaseUrl?: string | null): string | null {
  const base = deriveWebAppUrl(apiBaseUrl);
  if (!base) {
    return null;
  }
  return base;
}

