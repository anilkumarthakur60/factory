import { describe, expect, it } from 'vitest'
import { Faker } from '@/faker/faker'
import { Helpers } from '@/faker/helpers'
import { Mulberry32 } from '@/prng/mulberry32'

describe('Helpers.shuffle with undefined elements', () => {
  it('relocates `undefined` instead of pinning it to its original index', () => {
    const helpers = new Helpers(new Mulberry32(11))
    const input = ['a', undefined, 'c', 'd']
    const positions = new Map<number, number>()

    for (let i = 0; i < 4000; i++) {
      const at = helpers.shuffle(input).indexOf(undefined)
      positions.set(at, (positions.get(at) ?? 0) + 1)
    }

    // Fair would be ~1000 each; the old guard produced 4000 at index 1 only.
    expect(positions.size).toBe(4)
    for (const count of positions.values()) {
      expect(count).toBeGreaterThan(500)
      expect(count).toBeLessThan(1500)
    }
  })

  it('shuffles `undefined` as uniformly as a normal value', () => {
    const helpers = new Helpers(new Mulberry32(7))
    const permutations = new Set<string>()
    for (let i = 0; i < 4000; i++) {
      permutations.add(helpers.shuffle(['a', undefined, 'c', 'd']).join(','))
    }
    // 4! orderings; the old guard could only reach the 6 that keep index 1 fixed.
    expect(permutations.size).toBe(24)
  })

  it('preserves the multiset of elements', () => {
    const helpers = new Helpers(new Mulberry32(3))
    const input = [1, undefined, 3, undefined, 5]
    for (let i = 0; i < 200; i++) {
      const out = helpers.shuffle(input)
      expect(out).toHaveLength(5)
      expect([...out].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([1, 3, 5, undefined, undefined])
    }
  })

  it('lets arrayElements return every element, including `undefined`', () => {
    const f = new Faker({ seed: 11 })
    const input = ['a', undefined, 'c', 'd']
    let withUndefined = 0
    const runs = 2000
    for (let i = 0; i < runs; i++) {
      if (f.helpers.arrayElements(input, 2).includes(undefined)) withUndefined++
    }
    // Two of four slots => ~50%. The old behaviour returned it every time.
    expect(withUndefined).toBeGreaterThan(runs * 0.35)
    expect(withUndefined).toBeLessThan(runs * 0.65)
  })
})
