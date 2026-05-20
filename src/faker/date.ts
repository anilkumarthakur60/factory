import type { Prng } from '../prng/types'

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
 * ```
 */
export class DateGen {
  constructor(private readonly rng: Prng) {}

  past(days = 365): Date {
    const now = Date.now()
    return new Date(this.rng.int(now - days * DAY_MS, now - 1))
  }

  recent(days = 30): Date {
    return this.past(days)
  }

  future(days = 30): Date {
    const now = Date.now()
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
  birthdate(opts: { min?: number; max?: number } = {}): Date {
    const min = opts.min ?? 18
    const max = opts.max ?? 80
    const now = Date.now()
    const minTime = now - max * 365 * DAY_MS
    const maxTime = now - min * 365 * DAY_MS
    return new Date(this.rng.int(minTime, maxTime))
  }
}
