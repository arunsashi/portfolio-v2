import { Injectable, signal } from '@angular/core';

/**
 * Feature flags (playbook §7 — Statsig).
 *
 * STUB for the scaffold: every gate defaults OFF and fails safe. The real
 * implementation will init `@statsig/js-client` once at startup with the
 * CLIENT key + a stable anonymous id, then back `isEnabled` with the SDK.
 * Until then the UI must degrade gracefully when a gate is off.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly gates = signal<Record<string, boolean>>({});

  /** Returns false for unknown gates — fail safe. */
  isEnabled(gate: string): boolean {
    return this.gates()[gate] ?? false;
  }

  /** Temporary helper so the scaffold can preview gated sections locally. */
  setForDev(gate: string, value: boolean): void {
    this.gates.update((g) => ({ ...g, [gate]: value }));
  }
}
