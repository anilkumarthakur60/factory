import type { Prng } from '../../prng/types'
import type { LocaleRef } from '../locale'

/**
 * Postal-address namespace.
 *
 * @example
 * ```ts
 * faker.location.streetAddress()    // "742 Oak Ave"
 * faker.location.city()             // "Seattle"
 * faker.location.country()          // "United States"
 * faker.location.latitude()         // 47.6062
 * ```
 */
export class Location {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
  ) {}

  streetAddress(): string {
    return `${this.rng.int(100, 9999)} ${this.rng.pick(this.locale.data.streetNames)} ${this.rng.pick(this.locale.data.streetSuffixes)}`
  }

  city(): string {
    return this.rng.pick(this.locale.data.cities)
  }

  state(): string {
    return this.rng.pick(this.locale.data.states)
  }

  zipCode(): string {
    return String(this.rng.int(10_000, 99_999))
  }

  /** Locale's primary country (e.g. `"United States"` for `en`). */
  country(): string {
    return this.locale.data.country
  }

  /** Random country from the locale's broader country list. */
  countryName(): string {
    return this.rng.pick(this.locale.data.countries)
  }

  /** Full single-line address. */
  fullAddress(): string {
    return `${this.streetAddress()}, ${this.city()}, ${this.state()} ${this.zipCode()}`
  }

  latitude(min = -90, max = 90): number {
    return this.rng.float(min, max, 4)
  }

  longitude(min = -180, max = 180): number {
    return this.rng.float(min, max, 4)
  }
}
