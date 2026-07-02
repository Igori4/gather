import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMessages, type ChatMessage } from '@/api/chat'

export function useMessages(outingId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', outingId],
    queryFn: ({ pageParam }) => fetchMessages(outingId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  })
}

export function useAddMessageToCache(outingId: string) {
  const queryClient = useQueryClient()
  return (message: ChatMessage) => {
    queryClient.setQueryData(
      ['messages', outingId],
      (old: ReturnType<typeof useMessages>['data']) => {
        if (!old) return old
        const [firstPage, ...rest] = old.pages
        return {
          ...old,
          pages: [{ ...firstPage, messages: [message, ...firstPage.messages] }, ...rest],
        }
      }
    )
  }
}
