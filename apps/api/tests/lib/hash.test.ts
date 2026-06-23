import { hashToVariant } from '../../src/lib/hash'

describe('hashToVariant', () => {
  const variants = ['a', 'b'] as const

  it('is deterministic — same key always maps to the same variant', () => {
    const key = 'register-cta:user_12345'
    const first = hashToVariant(key, variants)
    for (let i = 0; i < 50; i++) {
      expect(hashToVariant(key, variants)).toBe(first)
    }
  })

  it('gives different keys independent, often-different variants', () => {
    const results = new Set<string>()
    for (let i = 0; i < 20; i++) {
      results.add(hashToVariant(`register-cta:user_${i}`, variants))
    }
    // With 20 distinct keys across 2 buckets we expect to see both at least once.
    expect(results.size).toBe(2)
  })

  it('distributes a large sample roughly evenly across variants', () => {
    const counts: Record<string, number> = { a: 0, b: 0 }
    const sampleSize = 10_000
    for (let i = 0; i < sampleSize; i++) {
      const variant = hashToVariant(`register-cta:user_${i}`, variants)
      counts[variant]++
    }
    const ratio = counts.a / sampleSize
    expect(ratio).toBeGreaterThan(0.45)
    expect(ratio).toBeLessThan(0.55)
  })

  it('supports more than two variants', () => {
    const threeWay = ['a', 'b', 'c'] as const
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    const sampleSize = 9_000
    for (let i = 0; i < sampleSize; i++) {
      const variant = hashToVariant(`some-experiment:user_${i}`, threeWay)
      counts[variant]++
    }
    for (const variant of threeWay) {
      const ratio = counts[variant] / sampleSize
      expect(ratio).toBeGreaterThan(0.28)
      expect(ratio).toBeLessThan(0.38)
    }
  })
})
