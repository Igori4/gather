import { createContext, useContext, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FlagsResponse, VariantResponse } from '@gather/shared'
import { api } from './axios'

const FlagsContext = createContext<Record<string, boolean> | null>(null)

export async function fetchFlags(): Promise<Record<string, boolean>> {
  const { data } = await api.get<FlagsResponse>('/api/flags')
  return data.flags
}

export const FEATURE_FLAGS_QUERY_KEY = ['feature-flags']

// main.tsx prefetches FEATURE_FLAGS_QUERY_KEY into the QueryClient before the
// first render (alongside the auth-refresh call that already blocks first
// paint) — so by the time this provider mounts, `data` is already cached and
// there's no loading branch to flicker through. Trade-off: first paint waits
// on one extra request, but it runs in parallel with auth refresh so the
// added latency is ~0 in practice. Per-experiment variants (useABVariant)
// are NOT prefetched this way since the set of experiments in use isn't
// known up front — those have their own, narrower flicker to handle locally.
export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: FEATURE_FLAGS_QUERY_KEY,
    queryFn: fetchFlags,
    staleTime: Infinity,
  })

  return <FlagsContext.Provider value={data ?? {}}>{children}</FlagsContext.Provider>
}

export function useFeatureFlag(name: string): boolean {
  const flags = useContext(FlagsContext)
  if (flags === null) {
    throw new Error('useFeatureFlag must be used within a FeatureFlagProvider')
  }
  return flags[name] ?? false
}

export function useABVariant(experimentName: string): {
  variant: string | null
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['experiment-variant', experimentName],
    queryFn: async () => {
      const { data } = await api.get<VariantResponse>(
        `/api/experiments/${experimentName}/variant`
      )
      return data.variant
    },
    staleTime: Infinity,
  })

  return { variant: data ?? null, isLoading }
}
