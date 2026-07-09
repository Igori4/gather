import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { useAddMessageToCache, useUpdateMessageToCache } from '@/hooks/useMessages'
import { useQueryClient } from '@tanstack/react-query'
import type { ChatMessage } from '@/api/chat'

export function useChatRoom(outingId: string) {
  const addToCache = useAddMessageToCache(outingId)
  const updateCache = useUpdateMessageToCache(outingId)
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    function join() {
      socket.emit('outing:join', { outingId })
      queryClient.invalidateQueries({ queryKey: ['messages', outingId] })
    }

    function onMessage(message: ChatMessage) {
      addToCache(message)
    }

    function onEdited({
      messageId,
      newBody,
      editedAt,
    }: {
      messageId: string
      newBody: string
      editedAt: string
    }) {
      updateCache(messageId, { body: newBody, editedAt } as ChatMessage)
    }

    socket.on('connect', join)
    socket.on('chat:message', onMessage)
    socket.on('chat:message:edited', onEdited)

    if (socket.connected) join()

    return () => {
      socket.off('chat:message', onMessage)
      socket.off('chat:message:edited', onEdited)
      socket.off('connect', join)
      socket.emit('outing:leave', { outingId })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outingId, addToCache, updateCache])
}
