import type { Prng } from '@/prng/types'

const DAY_MS = 86_400_000

/**
 * Date / time generators.
 *
 * @example
 * ```ts
 * faker.date.past()            // a Date in the last 365 days
 * faker.date.recent(30)        // last 30 days
 * faker.date.future(60)        // next 60 days
 * faker.date.between(a, b)
 * faker.date.birthdate({ min: 18, max: 65 })
 *
 * // Pinned to a fixed anchor — output is reproducible across runs:
 * new DateGen(rng, () => Date.UTC(2024, 0, 1))
 * ```
 */
export class DateGen {
  /**
   * @param rng    Shared PRNG.
   * @param now    Reference clock. Relative helpers (`past`, `future`,
   *   `birthdate`, …) anchor on this instead of reading the wall clock
   *   directly, so a caller can pin it and get output that is reproducible
   *   from the seed alone. Defaults to `Date.now` for back-compat.
   */
  constructor(
    private readonly rng: Prng,
    private readonly now: () => number = Date.now,
  ) {}

  past(days = 365): Date {
    const now = this.now()
    return new Date(this.rng.int(now - days * DAY_MS, now - 1))
  }

  recent(days = 30): Date {
    return this.past(days)
  }

  future(days = 30): Date {
    const now = this.now()
    return new Date(this.rng.int(now + 1, now + days * DAY_MS))
  }

  soon(days = 7): Date {
    return this.future(days)
  }

  between(from: Date, to: Date): Date {
    const a = from.getTime()
    const b = to.getTime()
    return new Date(this.rng.int(Math.min(a, b), Math.max(a, b)))
  }

  /** ISO-8601 string of a random recent date. */
  iso(days = 365): string {
    return this.past(days).toISOString()
  }

  /** A plausible birthdate for someone in `[min, max]` years old. */
  birthdate(opts: { max?: number; min?: number } = {}): Date {
    const min = opts.min ?? 18
    const max = opts.max ?? 80
    const now = this.now()
    const minTime = now - max * 365 * DAY_MS
    const maxTime = now - min * 365 * DAY_MS
    return new Date(this.rng.int(minTime, maxTime))
  }
}
