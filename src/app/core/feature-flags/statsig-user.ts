import type { StatsigUser } from '@statsig/js-client';

const STORAGE_KEY = 'sg_visitor_id';

/**
 * Stable, anonymous per-visitor id (no PII). Persisted in localStorage so a
 * returning visitor keeps the same id (and therefore stable gate bucketing).
 * Falls back to an ephemeral id if storage is unavailable (private mode).
 */
export function getVisitorId(): string {
  const make = (): string =>
    globalThis.crypto?.randomUUID?.() ??
    `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = make();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return make();
  }
}

/** The Statsig user for an anonymous site visitor. */
export function buildStatsigUser(): StatsigUser {
  return { userID: getVisitorId() };
}
