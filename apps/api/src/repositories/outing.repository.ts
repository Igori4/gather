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
        places: { orderBy: { id: 'asc' } },
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
}
