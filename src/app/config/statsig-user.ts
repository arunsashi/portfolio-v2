import { STORAGE_KEYS } from '@core/const/storage.const';
import type { StatsigUser } from '@statsig/js-client';

/**
 * Stable, anonymous per-visitor id (no PII). Persisted in localStorage so a
 * returning visitor keeps the same id (and therefore stable gate bucketing).
 * Falls back to an ephemeral id if storage is unavailable (private mode).
 */
export function getVisitorId(): string {
  const make = (): string => {
    try {
      return crypto.randomUUID();
    } catch {
      // Insecure/old contexts without randomUUID.
      return `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    }
  };

  try {
    const existing = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
    if (existing) return existing;
    const id = make();
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, id);
    return id;
  } catch {
    return make();
  }
}

/** The Statsig user for an anonymous site visitor. */
export function buildStatsigUser(): StatsigUser {
  return { userID: getVisitorId() };
}
