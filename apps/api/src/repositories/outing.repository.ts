import { prisma } from '../lib/prisma'

export const OutingRepository = {
  create: (data: { groupId: string; title: string; description?: string | null; createdBy: string }) =>
    prisma.outing.create({ data }),

  findAllForGroup: (groupId: string) =>
    prisma.outing.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, description: true, status: true, createdAt: true, createdBy: true },
    }),

  findById: (id: string) =>
    prisma.outing.findUnique({ where: { id } }),

  findByIdWithGroup: (id: string) =>
    prisma.outing.findUnique({
      where: { id },
      include: { group: { include: { members: { select: { userId: true } } } } },
    }),
}
