import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { verifyAccessToken } from '../lib/jwt'

export function initSocket(server: HttpServer): void {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  })

  // Auth middleware — every connection must supply a valid access token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      return next(new Error('Authentication required'))
    }
    try {
      const payload = verifyAccessToken(token)
      // Attach userId for use in all event handlers
      ;(socket as typeof socket & { userId: string }).userId = payload.userId
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', socket => {
    const userId = (socket as typeof socket & { userId: string }).userId
    console.log(`[socket] Connected: ${socket.id} (user: ${userId})`)

    // TODO PBI-4.2: outing:join / outing:leave handlers — verify group membership before joining room
    // TODO PBI-4.3: chat:message handler
    // TODO PBI-4.4: chat:typing handler
    // TODO PBI-4.5: vote:cast / slot:vote handlers
    // TODO PBI-4.6: rsvp:updated / outing:confirmed handlers
    // TODO PBI-4.7: presence:join / presence:leave handlers

    socket.on('disconnect', () => {
      console.log(`[socket] Disconnected: ${socket.id} (user: ${userId})`)
    })
  })
}
