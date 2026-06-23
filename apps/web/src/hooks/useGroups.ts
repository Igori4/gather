import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateGroupInput } from '@gather/shared'
import { listGroups, createGroup } from '@/api/groups'

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: listGroups,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupInput) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}
