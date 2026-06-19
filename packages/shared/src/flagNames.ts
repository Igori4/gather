// Canonical flag/experiment name constants — shared so neither app hardcodes
// magic strings. Flag *values* (enabled state, variant list, descriptions)
// are still owned by the backend (apps/api/src/lib/flags.ts); this file only
// fixes the names both sides refer to.

export const FEATURE_FLAGS = {
  COMPACT_NAV: 'compact-nav',
} as const

export type FeatureFlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]

export const EXPERIMENTS = {
  REGISTER_CTA: 'register-cta',
} as const

export type ExperimentName = (typeof EXPERIMENTS)[keyof typeof EXPERIMENTS]
