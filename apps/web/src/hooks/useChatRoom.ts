import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { useAddMessageToCache } from '@/hooks/useMessages'
import type { ChatMessage } from '@/api/chat'

export function useChatRoom(outingId: string) {
  const addToCache = useAddMessageToCache(outingId)

  useEffect(() => {
    const socket = getSocket()

    socket.emit('outing:join', { outingId })

    function onMessage(message: ChatMessage) {
      addToCache(message)
    }

    socket.on('chat:message', onMessage)

    return () => {
      socket.off('chat:message', onMessage)
      socket.emit('outing:leave', { outingId })
    }
  }, [outingId])
}
