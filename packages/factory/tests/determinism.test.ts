import { describe, expect, it } from 'vitest'
import { array, defineFactory, faker, maybe, oneOf } from '@'

/**
 * Regression tests for the builder determinism leak.
 *
 * `oneOf` / `maybe` / `array` take no arguments, so they cannot reach the
 * `BuildContext`. They used to read the shared default faker singleton, which
 * meant `Factory.seed(n)` did NOT make them reproducible — the headline
 * "seedable" guarantee silently failed for the builders that the README's
 * first example uses.
 *
 * They now resolve against the faker of the factory currently building.
 */
describe('seeded determinism through builder helpers', () => {
  const makeFactory = () =>
    defineFactory<{ id: number; seeded: string; viaBuilder: string }>(({ seq, faker }) => ({
      id: seq,
      seeded: faker.person.firstName(),
      viaBuilder: oneOf(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']),
    }))

  it('oneOf() is reproducible under the same seed even if the default faker advanced', () => {
    const first = makeFactory().seed(42).makeOne()

    // Perturb ONLY the shared default faker. A correctly seeded factory must
    // be unaffected by this.
    for (let i = 0; i < 5; i++) faker.person.firstName()

    const second = makeFactory().seed(42).makeOne()

    expect(second.seeded).toBe(first.seeded)
    expect(second.viaBuilder).toBe(first.viaBuilder)
    expect(second).toEqual(first)
  })

  it('a full seeded batch is byte-identical across runs', () => {
    const a = makeFactory().seed(7).count(5).makeMany()
    for (let i = 0; i < 3; i++) faker.person.lastName()
    const b = makeFactory().seed(7).count(5).makeMany()

    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('different seeds still produce different data', () => {
    const a = makeFactory().seed(1).count(8).makeMany()
    const b = makeFactory().seed(2).count(8).makeMany()

    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('maybe() is reproducible under the same seed', () => {
    const f = () =>
      defineFactory<{ bio: string | undefined }>(() => ({
        bio: maybe('a-bio', 0.5),
      }))

    const a = f().seed(99).count(10).makeMany()
    for (let i = 0; i < 4; i++) faker.person.firstName()
    const b = f().seed(99).count(10).makeMany()

    expect(b).toEqual(a)
  })

  it('array(min, max, fn) length is reproducible under the same seed', () => {
    const f = () =>
      defineFactory<{ tags: string[] }>(() => ({
        tags: array(1, 6, (i) => `tag-${String(i)}`),
      }))

    const a = f().seed(5).count(6).makeMany()
    for (let i = 0; i < 4; i++) faker.person.firstName()
    const b = f().seed(5).count(6).makeMany()

    expect(b).toEqual(a)
  })

  it('nested relation factories restore the parent faker, keeping both seeded', () => {
    const child = () =>
      defineFactory<{ kind: string }>(() => ({ kind: oneOf(['x', 'y', 'z']) })).seed(3)

    const parent = () =>
      defineFactory<{ role: string }>(() => ({ role: oneOf(['admin', 'editor', 'viewer']) }))
        .has(child().count(2), 'children')
        .seed(11)

    const a = parent().count(3).makeMany()
    for (let i = 0; i < 5; i++) faker.person.firstName()
    const b = parent().count(3).makeMany()

    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('builders still work outside a factory build, using the default faker', () => {
    expect(['a', 'b', 'c']).toContain(oneOf(['a', 'b', 'c']))
    expect(maybe('v', 1)).toBe('v')
    expect(array(3, (i) => i)).toEqual([0, 1, 2])
  })
})
