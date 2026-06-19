import { prisma } from './prisma'
import { experimentDefinitions, ExperimentName } from './flags'
import { hashToVariant } from './hash'

export interface Subject {
  userId?: string
  anonymousId?: string
}

export async function assignVariant(
  experimentName: ExperimentName,
  subject: Subject
): Promise<string> {
  const definition = experimentDefinitions[experimentName]
  if (!definition) {
    throw new Error(`Unknown experiment: ${experimentName}`)
  }
  if (!subject.userId && !subject.anonymousId) {
    throw new Error('assignVariant requires a userId or anonymousId')
  }

  const where = subject.userId
    ? { experimentName_userId: { experimentName, userId: subject.userId } }
    : { experimentName_anonymousId: { experimentName, anonymousId: subject.anonymousId! } }

  const existing = await prisma.experimentAssignment.findUnique({ where })
  if (existing) return existing.variant

  const subjectId = subject.userId ?? subject.anonymousId!
  const variant = hashToVariant(`${experimentName}:${subjectId}`, definition.variants)

  try {
    const created = await prisma.experimentAssignment.create({
      data: {
        experimentName,
        userId: subject.userId,
        anonymousId: subject.anonymousId,
        variant,
      },
    })
    return created.variant
  } catch {
    // Race: a concurrent request created the assignment first — read it back.
    const race = await prisma.experimentAssignment.findUnique({ where })
    if (race) return race.variant
    throw new Error(`Failed to assign variant for ${experimentName}`)
  }
}
