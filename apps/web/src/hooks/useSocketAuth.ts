import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { connectSocket, getSocket, disconnectSocket } from '@/lib/socket'
import { api } from '@/lib/axios'

export function useSocketAuth() {
  const accessToken = useAuthStore(s => s.accessToken)

  useEffect(() => {
    if (accessToken) connectSocket(accessToken)

    const socket = getSocket()

    async function onConnectError(err: Error) {
      if (err.message !== 'Invalid or expired token') return
      try {
        const res = await api.post<{ accessToken: string }>('/auth/refresh')
        useAuthStore.getState().setAccessToken(res.data.accessToken)
        connectSocket(res.data.accessToken)
      } catch {
        window.location.href = '/login'
      }
    }

    socket.on('connect_error', onConnectError)
    return () => {
      socket.off('connect_error', onConnectError)
      disconnectSocket()
    }
  }, [accessToken])
}
