import { prisma } from './prisma'
import { ExperimentName } from './flags'

export interface VariantConversionRate {
  variant: string
  exposed: number
  converted: number
  conversionRate: number
}

// Simplest possible conversion-rate query: one groupBy over the Event table,
// bucketed by variant + event type, then divide converted/exposed per variant.
export async function getConversionRates(
  experimentName: ExperimentName
): Promise<VariantConversionRate[]> {
  const rows = await prisma.event.groupBy({
    by: ['variant', 'type'],
    where: { experimentName, type: { in: ['experiment_exposed', 'experiment_converted'] } },
    _count: { _all: true },
  })

  const byVariant = new Map<string, { exposed: number; converted: number }>()
  for (const row of rows) {
    if (!row.variant) continue
    const entry = byVariant.get(row.variant) ?? { exposed: 0, converted: 0 }
    if (row.type === 'experiment_exposed') entry.exposed = row._count._all
    if (row.type === 'experiment_converted') entry.converted = row._count._all
    byVariant.set(row.variant, entry)
  }

  return Array.from(byVariant.entries()).map(([variant, { exposed, converted }]) => ({
    variant,
    exposed,
    converted,
    conversionRate: exposed > 0 ? converted / exposed : 0,
  }))
}
