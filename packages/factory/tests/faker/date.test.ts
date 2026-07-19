import { describe, expect, it } from 'vitest'
import { Faker } from '@/faker/faker'
import { DateGen } from '@/faker/date'
import { createPrng } from '@/prng'

const ANCHOR = Date.UTC(2024, 0, 1, 12, 0, 0)

/** Same seed, same pin, two independent instances — the whole point of seeding. */
const pinned = (): Faker => new Faker({ seed: 42, refDate: ANCHOR })

describe('faker.date reference date', () => {
  it('produces identical output from two independently seeded fakers', () => {
    const draw = (f: Faker): string[] => [
      f.date.past().toISOString(),
      f.date.recent(30).toISOString(),
      f.date.future().toISOString(),
      f.date.soon(7).toISOString(),
      f.date.iso(),
      f.date.birthdate({ min: 18, max: 65 }).toISOString(),
    ]

    const a = draw(pinned())
    // Burn wall-clock time: unpinned, this alone is enough to make b !== a.
    const t = Date.now()
    while (Date.now() - t < 25) {
      /* spin */
    }
    const b = draw(pinned())

    expect(b).toEqual(a)
  })

  it('anchors the ranges on the pinned date rather than now', () => {
    const f = pinned()
    const past = f.date.past(10).getTime()
    expect(past).toBeGreaterThanOrEqual(ANCHOR - 10 * 86_400_000)
    expect(past).toBeLessThan(ANCHOR)

    const future = f.date.future(10).getTime()
    expect(future).toBeGreaterThan(ANCHOR)
    expect(future).toBeLessThanOrEqual(ANCHOR + 10 * 86_400_000)

    // Well in the past relative to the real clock, proving `now` is not consulted.
    const born = f.date.birthdate({ min: 18, max: 18 }).getTime()
    expect(born).toBeCloseTo(ANCHOR - 18 * 365 * 86_400_000, -5)
  })

  it('defaults to the wall clock, and can be reset back to it', () => {
    const f = new Faker({ seed: 7 })
    expect(f.currentRefDate()).toBeNull()
    expect(Math.abs(f.date.future(1).getTime() - Date.now())).toBeLessThanOrEqual(86_400_000)

    f.refDate(ANCHOR)
    expect(f.currentRefDate()?.getTime()).toBe(ANCHOR)
    expect(f.date.past(1).getTime()).toBeGreaterThanOrEqual(ANCHOR - 86_400_000)

    f.refDate(null)
    expect(f.currentRefDate()).toBeNull()
    expect(Math.abs(f.date.past(1).getTime() - Date.now())).toBeLessThanOrEqual(86_400_000)
  })

  it('accepts a Date instance and carries the pin across fork()', () => {
    const f = new Faker({ seed: 1 }).refDate(new Date(ANCHOR))
    expect(f.currentRefDate()?.getTime()).toBe(ANCHOR)

    const forked = f.fork()
    expect(forked.currentRefDate()?.getTime()).toBe(ANCHOR)
    expect(forked.date.past(1).getTime()).toBeGreaterThanOrEqual(ANCHOR - 86_400_000)
  })

  it('lets DateGen take an injectable clock directly', () => {
    let ticks = ANCHOR
    const gen = new DateGen(createPrng(3), () => ticks)
    const first = gen.past(1).getTime()

    ticks = ANCHOR + 86_400_000
    const second = new DateGen(createPrng(3), () => ticks).past(1).getTime()

    // Same seed, clock advanced by exactly one day — output shifts by one day.
    expect(second - first).toBe(86_400_000)
  })
})
