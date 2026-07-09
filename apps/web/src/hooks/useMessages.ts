import { useCallback } from 'react'
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
  return useCallback(
    (message: ChatMessage) => {
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
    },
    [outingId]
  )
}

export function useUpdateMessageToCache(outingId: string) {
  const queryClient = useQueryClient()
  return useCallback(
    (id: string, message: ChatMessage) => {
      queryClient.setQueryData(
        ['messages', outingId],
        (old: ReturnType<typeof useMessages>['data']) => {
          if (!old) return old
          let isUpdated = false

          const pages = old.pages.map(page => {
            const hasMessage = page.messages.some(m => m.id === id)
            if (!hasMessage) return page

            isUpdated = true
            return {
              ...page,
              messages: page.messages.map(m => (m.id === id ? { ...m, ...message } : m)),
            }
          })

          if (!isUpdated) return old
          return { ...old, pages }
        }
      )
    },
    [outingId]
  )
}
