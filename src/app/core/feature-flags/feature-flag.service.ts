import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatsigService } from '@statsig/angular-bindings';

import { environment } from '../../../environments/environment';

/**
 * Feature flags (playbook §7 — Statsig).
 *
 * Backed by @statsig/angular-bindings when a client key is configured; gates
 * are read through `isEnabled`. Fails safe in every degraded case — no key,
 * Statsig blocked (CSP/adblock), or values not yet loaded all yield OFF.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  // Only inject StatsigService when a key is present (it requires the init
  // config token, which is only provided in that case — see provideStatsig).
  private readonly statsig = environment.statsigClientKey
    ? inject(StatsigService, { optional: true })
    : null;

  // Bumped when Statsig finishes loading so template reads of isEnabled()
  // re-evaluate (zoneless-friendly reactive dependency).
  private readonly revision = signal(0);
  private readonly devOverrides = signal<Record<string, boolean>>({});

  constructor() {
    this.statsig?.isLoading$.pipe(takeUntilDestroyed()).subscribe((loading) => {
      if (!loading) this.revision.update((r) => r + 1);
    });
  }

  /** True only when the gate is explicitly ON. Unknown/blocked => false. */
  isEnabled(gate: string): boolean {
    this.revision(); // reactive dependency

    const override = this.devOverrides()[gate];
    if (override !== undefined) return override;

    if (!this.statsig) return false;
    try {
      return this.statsig.checkGate(gate);
    } catch {
      return false;
    }
  }

  /** Local-only override for previewing gated sections during development. */
  setForDev(gate: string, value: boolean): void {
    this.devOverrides.update((g) => ({ ...g, [gate]: value }));
  }
}
