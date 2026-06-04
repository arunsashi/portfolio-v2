import { Injectable, signal } from '@angular/core';

/**
 * Drives the page-level loader and its failure state. Counts in-flight HTTP
 * requests (via the loading interceptor) and keeps the loader up until the
 * FIRST batch settles.
 *
 * - `loading` starts true so the loader covers the lazy route + first paint.
 * - Once requests drain to zero (debounced, to tolerate staggered component
 *   fetches) the loader is dismissed and stays dismissed — later/deferred
 *   requests won't re-show it.
 * - `failed` flips true when the initial batch produced ZERO successful
 *   responses (API down, CORS, total outage) — including when requests hang
 *   until the failsafe. Partial failures degrade per-section instead.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly loading = signal(true);
  readonly failed = signal(false);

  private pending = 0;
  private started = 0;
  private completed = 0; // settled requests (success or error)
  private failures = 0;
  private settled = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Target time to reveal the page. At this point: data arrived -> reveal;
   *  requests still in flight (e.g. Function App cold start) -> keep waiting;
   *  everything settled with zero successes -> error page. */
  private static readonly SOFT_DEADLINE_MS = 3_000;

  /** Absolute ceiling — if nothing has succeeded by now (hung requests,
   *  total outage), give up and show the error page. */
  private static readonly HARD_DEADLINE_MS = 15_000;

  constructor() {
    setTimeout(() => { this.onSoftDeadline(); }, LoadingService.SOFT_DEADLINE_MS);
    setTimeout(() => { this.finish(); }, LoadingService.HARD_DEADLINE_MS);
  }

  private onSoftDeadline(): void {
    if (this.settled) return;
    const succeeded = this.completed - this.failures;
    // Keep the loader up only for the genuinely-still-loading case: requests
    // pending and nothing usable yet. Everything else resolves now.
    if (succeeded === 0 && this.pending > 0) return;
    this.finish();
  }

  start(): void {
    if (this.settled) return;
    this.started++;
    this.pending++;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.loading.set(true);
  }

  /** Called by the interceptor when a request errors (before finalize). */
  markFailure(): void {
    if (this.settled) return;
    this.failures++;
  }

  stop(): void {
    if (this.settled) return;
    this.pending = Math.max(0, this.pending - 1);
    this.completed++;
    if (this.pending === 0) {
      // Debounce: components mount and fire requests slightly apart, so wait a
      // beat before declaring the initial load done.
      this.hideTimer = setTimeout(() => { this.finish(); }, 300);
    }
  }

  private finish(): void {
    if (this.settled) return;
    this.settled = true;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    const succeeded = this.completed - this.failures;
    this.failed.set(this.started > 0 && succeeded <= 0);
    this.loading.set(false);
  }
}
