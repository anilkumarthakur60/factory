import { describe, expect, it } from 'vitest'
import { Mulberry32, createPrng } from '../src'

describe('Mulberry32', () => {
  it('is deterministic from the same seed', () => {
    const a = new Mulberry32(42)
    const b = new Mulberry32(42)
    expect(a.int(0, 1_000_000)).toBe(b.int(0, 1_000_000))
    expect(a.float(0, 1)).toBe(b.float(0, 1))
  })

  it('produces different streams from different seeds', () => {
    const a = new Mulberry32(1)
    const b = new Mulberry32(2)
    expect(a.int(0, 1_000_000)).not.toBe(b.int(0, 1_000_000))
  })

  it('reseed resets the stream', () => {
    const p = createPrng(123)
    const first = p.int(0, 1_000_000)
    p.seed(123)
    const second = p.int(0, 1_000_000)
    expect(first).toBe(second)
  })

  it('respects range bounds inclusive', () => {
    const p = new Mulberry32(7)
    for (let i = 0; i < 200; i++) {
      const v = p.int(5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(10)
    }
  })

  it('pick throws on empty array', () => {
    const p = new Mulberry32(1)
    expect(() => p.pick([])).toThrow(/empty/)
  })

  it('rounds float to the requested decimals', () => {
    const p = new Mulberry32(99)
    const v = p.float(0, 1, 3)
    expect(v).toBeLessThan(1)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(3)
  })
})
