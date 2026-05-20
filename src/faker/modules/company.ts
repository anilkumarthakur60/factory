import type { Prng } from '../../prng/types'
import type { LocaleRef } from '../locale'

/**
 * Company / employment generators.
 *
 * @example
 * ```ts
 * faker.company.name()        // "Stark Industries"
 * faker.company.jobTitle()    // "Frontend Developer"
 * faker.company.buzzPhrase()  // "leverage cross-platform synergies"
 * ```
 */
export class Company {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
  ) {}

  name(): string {
    return this.rng.pick(this.locale.data.companies)
  }

  jobTitle(): string {
    return this.rng.pick(this.locale.data.jobTitles)
  }

  buzzPhrase(): string {
    return this.rng.pick(this.locale.data.buzzPhrases)
  }
}
