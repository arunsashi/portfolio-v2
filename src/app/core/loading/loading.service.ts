import { Injectable, signal } from '@angular/core';

/**
 * Drives the page-level loader. Counts in-flight HTTP requests (via the
 * loading interceptor) and keeps the loader up until the FIRST batch settles.
 *
 * - `loading` starts true so the loader covers the lazy route + first paint.
 * - Once requests drain to zero (debounced, to tolerate staggered component
 *   fetches) the loader is dismissed and stays dismissed — later/deferred
 *   requests won't re-show it.
 * - A failsafe timeout guarantees the loader never traps the user.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly loading = signal(true);

  private pending = 0;
  private settled = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Failsafe: dismiss after 12s even if the network hangs.
    setTimeout(() => this.finish(), 12_000);
  }

  start(): void {
    if (this.settled) return;
    this.pending++;
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.loading.set(true);
  }

  stop(): void {
    if (this.settled) return;
    this.pending = Math.max(0, this.pending - 1);
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
    this.loading.set(false);
  }
}
