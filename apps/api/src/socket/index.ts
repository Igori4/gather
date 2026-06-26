import { Server, Socket } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { verifyAccessToken } from '../lib/jwt'
import { registerChatHandler } from './chatHandler'

type AuthSocket = Socket & { userId: string }

let ioInstance: Server | null = null

export function getIo(): Server {
  if (!ioInstance) throw new Error('Socket.IO not initialized')
  return ioInstance
}

export function initSocket(server: HttpServer): void {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  })

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = verifyAccessToken(token)
      ;(socket as AuthSocket).userId = payload.userId
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  ioInstance.on('connection', socket => {
    registerChatHandler(ioInstance!, socket as AuthSocket)

    socket.on('disconnect', () => {
      // Presence cleanup — PBI-4.7
    })
  })
}
