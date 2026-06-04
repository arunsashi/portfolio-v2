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

  /** Max time the loader may stay up. After this: if nothing succeeded yet,
   *  show the error page; if some data already landed, just reveal the page. */
  private static readonly MAX_LOADER_MS = 3_000;

  constructor() {
    setTimeout(() => this.finish(), LoadingService.MAX_LOADER_MS);
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
      this.hideTimer = setTimeout(() => this.finish(), 300);
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
