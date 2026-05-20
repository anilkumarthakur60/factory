import { createPrng } from '@/prng'
import type { Prng } from '@/prng/types'
import { LocaleRef } from './locale'
import { Person } from './person'
import { Internet } from './internet'
import { Location } from './location'
import { Lorem } from './lorem'
import { DateGen } from './date'
import { NumberGen } from './number'
import { StringGen } from './string'
import { Color } from './color'
import { Company } from './company'
import { Commerce } from './commerce'
import { Finance } from './finance'
import { Image } from './image'
import { System } from './system'
import { Datatype } from './datatype'
import { Helpers } from './helpers'

/** Options for constructing a `Faker` instance. */
export interface FakerOptions {
  /** Initial PRNG seed. If omitted, a time-based seed is used. */
  seed?: number
  /** Initial locale name. Defaults to `"en"`. */
  locale?: string
}

/**
 * Faceted, seedable, locale-aware random-data generator.
 *
 * Every namespace shares the same PRNG and locale reference — `seed()` and
 * `locale()` mutate that shared state in place, so changes propagate without
 * re-constructing modules.
 *
 * @example
 * ```ts
 * import { Faker } from '@anil-labs/factory'
 *
 * const f = new Faker({ seed: 42, locale: 'en' })
 * f.person.fullName()    // "Olivia Patel"
 * f.seed(42)
 * f.person.fullName()    // "Olivia Patel" — deterministic
 *
 * // Or use the package's default instance:
 * import { faker } from '@anil-labs/factory'
 * faker.seed(1)
 * faker.internet.email()
 * ```
 */
export class Faker {
  private readonly rng: Prng
  private readonly localeRef: LocaleRef

  readonly person: Person
  readonly internet: Internet
  readonly location: Location
  readonly lorem: Lorem
  readonly date: DateGen
  readonly number: NumberGen
  readonly string: StringGen
  readonly color: Color
  readonly company: Company
  readonly commerce: Commerce
  readonly finance: Finance
  readonly image: Image
  readonly system: System
  readonly datatype: Datatype
  readonly helpers: Helpers

  constructor(opts: FakerOptions = {}) {
    this.rng = createPrng(opts.seed)
    this.localeRef = new LocaleRef(opts.locale ?? 'en')

    this.person = new Person(this.rng, this.localeRef)
    this.internet = new Internet(this.rng, this.localeRef)
    this.location = new Location(this.rng, this.localeRef)
    this.lorem = new Lorem(this.rng, this.localeRef)
    this.date = new DateGen(this.rng)
    this.number = new NumberGen(this.rng)
    this.string = new StringGen(this.rng)
    this.color = new Color(this.rng, this.localeRef)
    this.company = new Company(this.rng, this.localeRef)
    this.commerce = new Commerce(this.rng, this.localeRef)
    this.finance = new Finance(this.rng)
    this.image = new Image(this.rng)
    this.system = new System(this.rng, this.localeRef, this.string)
    this.datatype = new Datatype(this.rng)
    this.helpers = new Helpers(this.rng)
  }

  /** Reseed the underlying PRNG. Subsequent calls are deterministic from here. */
  seed(seed: number): this {
    this.rng.seed(seed)
    return this
  }

  /** Switch the active locale. Throws if unknown. */
  locale(name: string): this {
    this.localeRef.set(name)
    return this
  }

  /** Read the current locale identifier (e.g. `"en"`). */
  currentLocale(): string {
    return this.localeRef.name
  }

  /** Read the current seed (useful for snapshot reproduction). */
  currentSeed(): number {
    return this.rng.currentSeed
  }

  /**
   * Build a fresh, independent `Faker` with its own PRNG seeded from this
   * one's current state. Useful when you need to fork a deterministic stream.
   */
  fork(): Faker {
    return new Faker({ seed: this.rng.int(0, 0xffffffff), locale: this.localeRef.name })
  }

  /** Access the underlying PRNG. Advanced use only. */
  rawPrng(): Prng {
    return this.rng
  }
}

/** Default singleton — mutable via `faker.seed()` / `faker.locale()`. */
export const faker = new Faker()
