import { prisma } from '../lib/prisma'
import { Prisma } from '../generated/prisma/client'

export const EventRepository = {
  create: (data: {
    type: string
    experimentName?: string | null
    variant?: string | null
    userId?: string | null
    anonymousId?: string | null
    payload?: Prisma.InputJsonValue
  }) => prisma.event.create({ data }),
}
