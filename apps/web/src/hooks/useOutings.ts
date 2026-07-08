import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateOutingInput, AddPlaceInput } from '@gather/shared'
import { listOutings, createOuting, getOuting, addPlace, removePlace, castVote } from '@/api/outings'

export function useOutings(groupId: string) {
  return useQuery({
    queryKey: ['outings', groupId],
    queryFn: () => listOutings(groupId),
  })
}

export function useOuting(outingId: string) {
  return useQuery({
    queryKey: ['outing', outingId],
    queryFn: () => getOuting(outingId),
  })
}

export function useCreateOuting(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOutingInput) => createOuting(groupId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outings', groupId] }),
  })
}

export function useAddPlace(outingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AddPlaceInput) => addPlace(outingId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outing', outingId] }),
  })
}

export function useRemovePlace(outingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (placeId: string) => removePlace(outingId, placeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outing', outingId] }),
  })
}

export function useCastVote(outingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ placeId, vote }: { placeId: string; vote: 'up' | 'down' }) =>
      castVote(outingId, placeId, vote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['outing', outingId] }),
  })
}
