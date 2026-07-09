import { prisma } from '../lib/prisma'

const DAILY_LIMIT = 5

export const AiRepository = {
  countTodayForGroup: async (groupId: string): Promise<number> => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    return prisma.aiSuggestion.count({
      where: { groupId, generatedAt: { gte: startOfDay } },
    })
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (groupId: string, payload: any) =>
    prisma.aiSuggestion.create({
      data: { groupId, payload },
    }),

  findForGroup: (groupId: string) =>
    prisma.aiSuggestion.findMany({
      where: { groupId, dismissedAt: null },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    }),

  dismiss: (id: string) =>
    prisma.aiSuggestion.update({
      where: { id },
      data: { dismissedAt: new Date() },
    }),

  findById: (id: string) => prisma.aiSuggestion.findUnique({ where: { id } }),

  DAILY_LIMIT,
}
