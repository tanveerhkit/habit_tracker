const STORAGE_PREFIX = 'habit-tracker:';
function storageKey(key: string, scope = 'shared') {
  return `${STORAGE_PREFIX}${scope}:${key}`;
}

export function readStored<T>(key: string, fallback: T, scope = 'shared'): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(key, scope));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T, scope = 'shared') {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(key, scope), JSON.stringify(value));
  } catch {
    // Storage can be disabled in private browsing; the in-memory UI still works.
  }
}

export function removeStored(key: string, scope = 'shared') {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(key, scope));
  } catch {
    // Ignore storage errors.
  }
}
