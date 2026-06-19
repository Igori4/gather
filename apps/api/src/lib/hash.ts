import { createHash } from 'crypto'

// Deterministic bucketing via SHA-256 of `${experimentName}:${subjectId}`.
// Chosen over a numeric modulo of the id because cuid/uuid ids aren't numeric,
// and a cryptographic hash spreads buckets evenly regardless of id format —
// no shared state needed, and the same subject always lands in the same
// bucket without a DB round trip (the DB row only exists to make the
// assignment durable, e.g. if `variants` order ever changes for an experiment).
export function hashToVariant(key: string, variants: readonly string[]): string {
  const hash = createHash('sha256').update(key).digest('hex')
  const bucket = parseInt(hash.slice(0, 8), 16)
  return variants[bucket % variants.length]
}
