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
  /** Initial locale name. Defaults to `"en"`. */
  locale?: string
  /**
   * Fixed anchor for the relative `date.*` helpers. If omitted they read the
   * wall clock, which makes seeded date output drift between runs — pin this
   * when you need snapshots that are reproducible from the seed alone.
   */
  refDate?: Date | number
  /** Initial PRNG seed. If omitted, a time-based seed is used. */
  seed?: number
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
  /** `null` means "follow the wall clock" — see {@link Faker#refDate}. */
  private refDateMs: number | null = null

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
    if (opts.refDate !== undefined) this.refDate(opts.refDate)

    this.person = new Person(this.rng, this.localeRef)
    this.internet = new Internet(this.rng, this.localeRef)
    this.location = new Location(this.rng, this.localeRef)
    this.lorem = new Lorem(this.rng, this.localeRef)
    // Read through a closure rather than a captured value so `refDate()` keeps
    // working after construction, like `seed()` and `locale()` do.
    this.date = new DateGen(this.rng, () => this.refDateMs ?? Date.now())
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

  /**
   * Pin the anchor used by the relative `date.*` helpers (`past`, `recent`,
   * `future`, `soon`, `iso`, `birthdate`).
   *
   * Those helpers seed only the random *offset*; the anchor is the wall clock
   * by default, so two runs with the same seed produce dates that drift by the
   * elapsed real time. Pinning removes that ambient input and makes date output
   * reproducible from the seed alone. Pass `null` to go back to `Date.now()`.
   *
   * @example
   * ```ts
   * const f = new Faker({ seed: 42 }).refDate(Date.UTC(2024, 0, 1))
   * f.date.past()   // identical on every run
   * ```
   */
  refDate(d: Date | number | null): this {
    this.refDateMs = d === null ? null : typeof d === 'number' ? d : d.getTime()
    return this
  }

  /** Current pinned anchor, or `null` when following the wall clock. */
  currentRefDate(): Date | null {
    return this.refDateMs === null ? null : new Date(this.refDateMs)
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
    // Carry the pin across: a fork of a reproducible stream must stay reproducible.
    return new Faker({ seed: this.rng.int(0, 0xffffffff), locale: this.localeRef.name }).refDate(
      this.refDateMs,
    )
  }

  /** Access the underlying PRNG. Advanced use only. */
  rawPrng(): Prng {
    return this.rng
  }
}

/** Default singleton — mutable via `faker.seed()` / `faker.locale()`. */
export const faker = new Faker()
