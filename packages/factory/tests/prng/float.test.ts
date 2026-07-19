import { describe, expect, it } from 'vitest'
import { Faker } from '@/faker/faker'
import { Mulberry32 } from '@/prng/mulberry32'

describe('Prng.float stays inside [min, max)', () => {
  const ranges: readonly [number, number][] = [
    [0, 1],
    [10, 20],
    [-1, 1],
    [0.005, 0.015],
    [1.25, 1.3],
    [-0.05, -0.04],
  ]

  it('never returns `max` for any decimals setting', () => {
    const escapes: string[] = []
    for (const [min, max] of ranges) {
      for (const decimals of [0, 1, 2, 3]) {
        const p = new Mulberry32(1)
        for (let i = 0; i < 20_000; i++) {
          const v = p.float(min, max, decimals)
          // Collect rather than assert per draw — 480k `expect` calls are slow.
          if (v < min || v >= max) {
            escapes.push(
              `float(${String(min)}, ${String(max)}, ${String(decimals)}) = ${String(v)}`,
            )
          }
        }
      }
    }
    expect(escapes.slice(0, 5)).toEqual([])
  })

  it('holds for the seeds that used to round up to the bound', () => {
    // Mulberry32(43).float(0, 1, 3) returned exactly 1 under half-up rounding.
    expect(new Mulberry32(43).float(0, 1, 3)).toBeLessThan(1)
    for (let seed = 0; seed < 5000; seed++) {
      expect(new Mulberry32(seed).float(0, 1, 3)).toBeLessThan(1)
      expect(new Mulberry32(seed).float(0, 1, 0)).toBe(0)
    }
  })

  it('respects the requested decimal precision', () => {
    const p = new Mulberry32(99)
    for (let i = 0; i < 1000; i++) {
      const v = p.float(0, 1, 3)
      expect(v.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3)
    }
  })

  it('keeps faker.number.float inside its bounds', () => {
    const f = new Faker({ seed: 5 })
    for (let i = 0; i < 5000; i++) {
      const v = f.number.float({ min: 0, max: 1, decimals: 0 })
      expect(v).toBe(0)
    }
  })
})
