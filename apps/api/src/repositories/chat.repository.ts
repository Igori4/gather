import { prisma } from '../lib/prisma'

export const ChatRepository = {
  listMessages: (outingId: string, limit: number, cursor?: string) =>
    prisma.chatMessage.findMany({
      where: {
        outingId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),

  createMessage: (outingId: string, userId: string, body: string) =>
    prisma.chatMessage.create({
      data: { outingId, userId, body },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),

  findById: (id: string) => prisma.chatMessage.findUnique({ where: { id } }),

  editMessage: (id: string, body: string) =>
    prisma.chatMessage.update({
      where: { id },
      data: { body, editedAt: new Date() },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),

  deleteMessage: (id: string) => prisma.chatMessage.delete({ where: { id } }),
}
