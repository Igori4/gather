import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

export function initSocket(server: HttpServer): void {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  })

  io.on('connection', socket => {
    console.log(`[socket] Connected: ${socket.id}`)

    socket.on('disconnect', () => {
      console.log(`[socket] Disconnected: ${socket.id}`)
    })
  })
}
