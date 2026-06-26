import type { Server, Socket } from 'socket.io'
import { OutingRepository } from '../repositories/outing.repository'

type AuthSocket = Socket & { userId: string }

export function registerChatHandler(_io: Server, socket: AuthSocket): void {
  socket.on('outing:join', async ({ outingId }: { outingId: string }) => {
    const outing = await OutingRepository.findByIdWithGroup(outingId)
    if (!outing) return

    const isMember = outing.group.members.some(m => m.userId === socket.userId)
    if (!isMember) return

    socket.join(`outing:${outingId}`)
  })

  socket.on('outing:leave', ({ outingId }: { outingId: string }) => {
    socket.leave(`outing:${outingId}`)
  })
}
