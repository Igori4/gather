import {
  FEATURE_FLAGS,
  EXPERIMENTS,
  FeatureFlagName,
  ExperimentName,
} from '@gather/shared'

export { FEATURE_FLAGS, EXPERIMENTS }
export type { FeatureFlagName, ExperimentName }

interface FlagDefinition {
  name: FeatureFlagName
  description: string
  enabled: boolean
}

// Backend is the source of truth for flag *values* — names come from
// @gather/shared so the frontend never has to guess a magic string.
export const flagDefinitions: Record<FeatureFlagName, FlagDefinition> = {
  [FEATURE_FLAGS.COMPACT_NAV]: {
    name: FEATURE_FLAGS.COMPACT_NAV,
    description: 'Compact top nav (icon-only links) instead of the full labelled nav.',
    enabled: true,
  },
}

interface ExperimentDefinition {
  name: ExperimentName
  description: string
  variants: readonly string[]
}

export const experimentDefinitions: Record<ExperimentName, ExperimentDefinition> = {
  [EXPERIMENTS.REGISTER_CTA]: {
    name: EXPERIMENTS.REGISTER_CTA,
    description: 'RegisterPage submit button copy: "Create account" (a) vs "Get started free" (b).',
    variants: ['a', 'b'],
  },
}

export function isExperimentName(value: string): value is ExperimentName {
  return value in experimentDefinitions
}
