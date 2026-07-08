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
      include: {
        group: { include: { members: { select: { userId: true } } } },
        places: {
          orderBy: { id: 'asc' },
          include: { votes: { select: { userId: true, vote: true } } },
        },
        timeSlots: {
          orderBy: { startsAt: 'asc' },
          include: { votes: { select: { userId: true, available: true } } },
        },
      },
    }),

  addPlace: (data: { outingId: string; placeId: string; name: string; address: string; lat: number; lng: number; mapboxUrl?: string; addedBy: string }) =>
    prisma.outingPlace.create({ data }),

  findPlace: (outingId: string, placeId: string) =>
    prisma.outingPlace.findUnique({ where: { outingId_placeId: { outingId, placeId } } }),

  removePlace: (outingId: string, placeId: string) =>
    prisma.outingPlace.delete({ where: { outingId_placeId: { outingId, placeId } } }),

  findPlacesForOuting: (outingId: string) =>
    prisma.outingPlace.findMany({ where: { outingId }, orderBy: { id: 'asc' } }),

  proposeSlot: (data: { outingId: string; proposedBy: string; startsAt: Date; endsAt: Date }) =>
    prisma.timeSlot.create({ data }),

  findSlot: (slotId: string) =>
    prisma.timeSlot.findUnique({ where: { id: slotId } }),

  findSlotsForOuting: (outingId: string) =>
    prisma.timeSlot.findMany({
      where: { outingId },
      orderBy: { startsAt: 'asc' },
      include: { votes: { select: { userId: true, available: true } } },
    }),

  deleteSlot: (slotId: string) =>
    prisma.timeSlot.delete({ where: { id: slotId } }),

  voteSlot: async (slotId: string, userId: string, available: boolean) => {
    await prisma.timeSlotVote.upsert({
      where: { slotId_userId: { slotId, userId } },
      create: { slotId, userId, available },
      update: { available },
    })
    const votes = await prisma.timeSlotVote.findMany({ where: { slotId } })
    return {
      available: votes.filter(v => v.available).length,
      unavailable: votes.filter(v => !v.available).length,
      userVote: votes.find(v => v.userId === userId)?.available ?? null,
    }
  },

  findVote: (outingId: string, placeId: string, userId: string) =>
    prisma.placeVote.findUnique({
      where: { outingId_placeId_userId: { outingId, placeId, userId } },
    }),

  castVote: async (outingId: string, placeId: string, userId: string, vote: 'up' | 'down') => {
    const existing = await prisma.placeVote.findUnique({
      where: { outingId_placeId_userId: { outingId, placeId, userId } },
    })

    if (existing?.vote === vote) {
      await prisma.placeVote.delete({
        where: { outingId_placeId_userId: { outingId, placeId, userId } },
      })
    } else {
      await prisma.placeVote.upsert({
        where: { outingId_placeId_userId: { outingId, placeId, userId } },
        create: { outingId, placeId, userId, vote },
        update: { vote },
      })
    }

    const votes = await prisma.placeVote.findMany({ where: { outingId, placeId } })
    return {
      up: votes.filter(v => v.vote === 'up').length,
      down: votes.filter(v => v.vote === 'down').length,
      userVote: votes.find(v => v.userId === userId)?.vote ?? null,
    }
  },
}
