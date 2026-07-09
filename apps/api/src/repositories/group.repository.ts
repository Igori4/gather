import { UpdateGroupInput } from '@gather/shared'
import { prisma } from '../lib/prisma'

export const GroupRepository = {
  create: (data: { name: string; description?: string | null; createdBy: string }) =>
    prisma.group.create({
      data: {
        ...data,
        members: { create: { userId: data.createdBy, role: 'admin' } },
      },
    }),

  findAllForUser: (userId: string) =>
    prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string) => prisma.group.findUnique({ where: { id } }),

  findByIdWithMembers: (id: string) =>
    prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, email: true } },
          },
        },
      },
    }),

  findMembership: (groupId: string, userId: string) =>
    prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    }),

  findInvitation: (token: string) => prisma.invitation.findUnique({ where: { token } }),

  // Transaction: create member + mark invitation accepted atomically
  joinViaInvitation: (invitationId: string, groupId: string, userId: string, role: string) =>
    prisma.$transaction([
      prisma.groupMember.create({ data: { groupId, userId, role } }),
      prisma.invitation.update({ where: { id: invitationId }, data: { acceptedAt: new Date() } }),
    ]),

  createInvitation: (data: {
    groupId: string
    email: string
    role: string
    token: string
    expiresAt: Date
  }) => prisma.invitation.create({ data }),

  update: (id: string, data: UpdateGroupInput) => prisma.group.update({ where: { id }, data }),

  removeMember: (groupId: string, userId: string) =>
    prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId } } }),

  countAdmins: (groupId: string) => prisma.groupMember.count({ where: { groupId, role: 'admin' } }),
}
