import type { Prng } from '../../prng/types'
import type { LocaleRef } from '../locale'

/**
 * Personal-name namespace.
 *
 * @example
 * ```ts
 * faker.person.firstName()       // "Sarah"
 * faker.person.firstName('male') // "James"
 * faker.person.fullName()        // "Olivia Patel"
 * faker.person.jobTitle()        // → from `company.jobTitle()`
 * ```
 */
export class Person {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
  ) {}

  firstName(sex?: 'male' | 'female'): string {
    const d = this.locale.data
    if (sex === 'male' && d.firstNamesMale?.length) return this.rng.pick(d.firstNamesMale)
    if (sex === 'female' && d.firstNamesFemale?.length) return this.rng.pick(d.firstNamesFemale)
    return this.rng.pick(d.firstNames)
  }

  lastName(): string {
    return this.rng.pick(this.locale.data.lastNames)
  }

  fullName(
    opts: { sex?: 'male' | 'female'; withPrefix?: boolean; withSuffix?: boolean } = {},
  ): string {
    const parts: string[] = []
    if (opts.withPrefix) parts.push(this.prefix())
    parts.push(this.firstName(opts.sex), this.lastName())
    if (opts.withSuffix) parts.push(this.suffix())
    return parts.join(' ')
  }

  prefix(): string {
    return this.rng.pick(this.locale.data.prefixes)
  }

  suffix(): string {
    return this.rng.pick(this.locale.data.suffixes)
  }

  /** Returns `"male"` or `"female"`. */
  sex(): 'male' | 'female' {
    return this.rng.bool() ? 'male' : 'female'
  }
}
