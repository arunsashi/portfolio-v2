/**
 * Statsig feature gate names (single source of truth — must match the gate
 * names in the Statsig console).
 */
export const FEATURE_GATES = {
  /** When ON, the testimonials section is hidden. */
  SHOW_TESTIMONIALS: 'show_testimonials',
  /** When ON, the Career Changelog hides client pills and disables expand. */
  ALTERNATIVE_WORK_ARCHIVE: 'alternative_work_archive',
} as const;

export type FeatureGate = (typeof FEATURE_GATES)[keyof typeof FEATURE_GATES];
