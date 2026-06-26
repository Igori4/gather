import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateOutingInput } from '@gather/shared'
import { listOutings, createOuting, getOuting } from '@/api/outings'

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
