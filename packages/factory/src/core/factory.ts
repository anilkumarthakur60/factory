import { Faker, faker as defaultFaker } from '@/faker'
import type { FakerOptions } from '@/faker'
import { withFaker } from '@/faker/context'
import { isLazy } from '@/builders'
import { Collection } from './collection'
import { Sequence } from './sequence'
import type { SequenceEntry } from './sequence'
import type {
  BuildContext,
  Definition,
  HasAttachedRelation,
  HasRelation,
  Hook,
  Persist,
  StateValue,
} from './types'

/**
 * Internal mutable state — never exposed outside the factory. We rebuild
 * one of these on every clone, so chaining stays immutable from the caller's
 * perspective while staying simple internally.
 */
interface InternalState<T extends object> {
  activeStates: string[]
  afterCreating: Hook<T>[]
  afterMaking: Hook<T>[]
  count: number
  faker: Faker
  fieldSequences: Map<keyof T | string, readonly unknown[]>
  hasAttachedRelations: HasAttachedRelation<T, object>[]
  hasRelations: HasRelation<T, object>[]
  /** Locale requested via `locale()`, or null for the Faker default. */
  localeName: string | null
  overrides: Partial<T>
  ownsFaker: boolean
  persist: Persist<T> | null
  recycle: Map<string, readonly object[]>
  /**
   * Seed requested via `seed()`, or null when the factory is unseeded.
   * Tracked separately because `Faker.currentSeed()` reports the *drifting*
   * PRNG state, so the original seed cannot be recovered from the instance.
   */
  seedValue: number | null
  sequences: Sequence<T>[]
  states: Map<string, StateValue<T>>
}

/**
 * Laravel-inspired model factory for TypeScript. Immutable fluent chain — every
 * method returns a new factory, never mutating the original.
 *
 * @example
 * ```ts
 * interface User { id: number; name: string; email: string; active: boolean }
 *
 * const UserFactory = defineFactory<User>(({ seq, faker }) => ({
 *   id: seq,
 *   name: faker.person.fullName(),
 *   email: faker.internet.email(),
 *   active: true,
 * }))
 *   .state('admin', { role: 'admin' })
 *   .state('inactive', { active: false })
 *
 * UserFactory.make()                    // single User
 * UserFactory.count(5).make()           // User[]
 * UserFactory.state('admin').make()     // with admin overrides
 * await UserFactory.persist(...).create()
 * ```
 */
export class Factory<T extends object> {
  /** @internal */ private readonly definition: Definition<T>
  /** @internal */ private readonly internals: InternalState<T>

  /** @internal — use {@link defineFactory} or {@link Factory.define} instead. */
  private constructor(definition: Definition<T>, internals: InternalState<T>) {
    this.definition = definition
    this.internals = internals
  }

  // -------------------------------------------------------------------------
  // Construction
  // -------------------------------------------------------------------------

  /** Create a new factory. Mirrors Laravel's `Factory::new()`. */
  static define<T extends object>(definition: Definition<T>, persist?: Persist<T>): Factory<T> {
    return new Factory(definition, {
      faker: defaultFaker,
      count: 1,
      overrides: {},
      states: new Map(),
      activeStates: [],
      sequences: [],
      fieldSequences: new Map(),
      afterMaking: [],
      afterCreating: [],
      hasRelations: [],
      hasAttachedRelations: [],
      recycle: new Map(),
      persist: persist ?? null,
      ownsFaker: false,
      seedValue: null,
      localeName: null,
    })
  }

  /** Internal: build a copy with a single field replaced. */
  private clone(patch: Partial<InternalState<T>>): Factory<T> {
    const next: InternalState<T> = {
      faker: this.internals.faker,
      count: this.internals.count,
      overrides: this.internals.overrides,
      states: new Map(this.internals.states),
      activeStates: [...this.internals.activeStates],
      sequences: this.internals.sequences.map((s) => s.clone()),
      fieldSequences: new Map(this.internals.fieldSequences),
      afterMaking: [...this.internals.afterMaking],
      afterCreating: [...this.internals.afterCreating],
      hasRelations: [...this.internals.hasRelations],
      hasAttachedRelations: [...this.internals.hasAttachedRelations],
      recycle: new Map(this.internals.recycle),
      persist: this.internals.persist,
      ownsFaker: this.internals.ownsFaker,
      seedValue: this.internals.seedValue,
      localeName: this.internals.localeName,
      ...patch,
    }
    return new Factory(this.definition, next)
  }

  /**
   * Mint a private Faker from the tracked seed/locale pair. Always a fresh
   * instance: a Faker carries mutable PRNG *and* locale state, so handing an
   * existing one to a derived factory would let the derived factory's
   * `locale()` retro-actively rewrite the factory it came from.
   */
  private privateFaker(seed: number | null, locale: string | null): Faker {
    // exactOptionalPropertyTypes: omit the keys rather than pass undefined,
    // so Faker applies its own defaults (time-based seed, locale "en").
    const opts: FakerOptions = {}
    if (seed !== null) opts.seed = seed
    if (locale !== null) opts.locale = locale
    return new Faker(opts)
  }

  // -------------------------------------------------------------------------
  // Fluent chain
  // -------------------------------------------------------------------------

  /** Set how many items will be built on the next terminal call. */
  count(n: number): Factory<T> {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`[Factory] count(n): expected a non-negative integer, got ${String(n)}.`)
    }
    return this.clone({ count: n })
  }

  /** Alias of {@link count} — matches Laravel's `->times()`. */
  times(n: number): Factory<T> {
    return this.count(n)
  }

  /** Merge inline overrides into every built item. */
  with(overrides: Partial<T>): Factory<T> {
    return this.clone({ overrides: { ...this.internals.overrides, ...overrides } })
  }

  /**
   * Register a named state OR activate a previously-registered state.
   *
   *   - Two-arg form (`state(name, value)`) **registers** the state.
   *   - One-arg form (`state(name)`) **activates** it.
   *   - One-arg with a Sequence (`state(seq)`) attaches a sequence as a state.
   */
  state(arg1: string | Sequence<T>, value?: StateValue<T>): Factory<T> {
    if (arg1 instanceof Sequence) {
      return this.clone({ sequences: this.clonedSequences(arg1) })
    }
    if (value !== undefined) {
      const states = new Map(this.internals.states)
      states.set(arg1, value)
      return this.clone({ states })
    }
    if (!this.internals.states.has(arg1)) {
      throw new Error(
        `[Factory] Unknown state "${arg1}". Register it first via .state("${arg1}", ...).`,
      )
    }
    return this.clone({ activeStates: [...this.internals.activeStates, arg1] })
  }

  /** Bulk-register multiple states. */
  states(map: Record<string, StateValue<T>>): Factory<T> {
    const states = new Map(this.internals.states)
    for (const [name, value] of Object.entries(map)) states.set(name, value)
    return this.clone({ states })
  }

  /** Cycle values through one field across generated items. */
  fieldSequence<K extends keyof T>(field: K, values: readonly T[K][]): Factory<T> {
    // Reject an empty list at chain time, mirroring `new Sequence([])`. The
    // build site would otherwise compute `index % 0` → NaN and overwrite the
    // definition's value with `undefined` without a word.
    if (values.length === 0) {
      throw new Error(`[Factory] fieldSequence("${String(field)}"): expected at least one value.`)
    }
    const fieldSequences = new Map(this.internals.fieldSequences)
    fieldSequences.set(field, values)
    return this.clone({ fieldSequences })
  }

  /** Attach a sequence of attribute patches. */
  sequence(entries: readonly SequenceEntry<T>[]): Factory<T> {
    return this.clone({ sequences: this.clonedSequences(new Sequence<T>(entries)) })
  }

  /**
   * The sequence list for a derived factory: copies of the ones already
   * attached, plus `added`. `clone()` copies sequences too, but a `sequences`
   * patch overrides that copy — so without this the carried-over entries would
   * be the parent's *live* cursors and the two factories would draw from one
   * shared position.
   */
  private clonedSequences(added: Sequence<T>): Sequence<T>[] {
    return [...this.internals.sequences.map((s) => s.clone()), added.clone()]
  }

  // -------------------------------------------------------------------------
  // Relations
  // -------------------------------------------------------------------------

  /**
   * Attach child records under `key` (one-to-many).
   *
   * `key` is inferred as a literal so the built type gains the relation —
   * `UserFactory.has(PostFactory, 'posts').makeOne().posts` typechecks as
   * `Post[]` with no cast at the call site.
   */
  has<C extends object, K extends string>(
    childFactory: Factory<C>,
    key: K,
  ): Factory<T & Record<K, C[]>> {
    // The relation is written into the item by `buildOne`, which is untyped
    // key-wise, so the widening lives entirely in this signature.
    return this.clone({
      hasRelations: [
        ...this.internals.hasRelations,
        {
          kind: 'has',
          factory: childFactory as unknown as HasRelation<T, object>['factory'],
          count: childFactory.internals.count,
          key,
        },
      ],
    }) as unknown as Factory<T & Record<K, C[]>>
  }

  /**
   * Set a foreign-key field by either resolving from another factory
   * (eager — built once), a plain object (used directly), or a lazy callback
   * (built per-item).
   */
  for<P extends object>(
    parent: Factory<P> | P | (() => P),
    foreignKey: keyof T | string,
    resolver?: (parent: P) => Partial<T>,
  ): Factory<T> {
    let resolved: P
    if (typeof parent === 'function') {
      resolved = parent()
    } else if (parent instanceof Factory) {
      resolved = parent.makeOne()
    } else {
      resolved = parent
    }
    const patch = resolver
      ? resolver(resolved)
      : ({ [foreignKey]: (resolved as Record<string, unknown>)['id'] } as unknown as Partial<T>)
    return this.with(patch)
  }

  /**
   * Attach related records with pivot/intermediate data (many-to-many).
   *
   * As with {@link has}, `key` is inferred as a literal and widens the built
   * type — each child gains the `pivot` property the build actually writes.
   */
  hasAttached<C extends object, K extends string>(
    childFactory: Factory<C>,
    key: K,
    pivot: Record<string, unknown> | ((parent: T, child: C) => Record<string, unknown>) = {},
  ): Factory<T & Record<K, (C & { pivot: Record<string, unknown> })[]>> {
    return this.clone({
      hasAttachedRelations: [
        ...this.internals.hasAttachedRelations,
        {
          kind: 'hasAttached',
          factory: childFactory as unknown as HasAttachedRelation<T, object>['factory'],
          count: childFactory.internals.count,
          key,
          pivot: pivot as HasAttachedRelation<T, object>['pivot'],
        },
      ],
    }) as unknown as Factory<T & Record<K, (C & { pivot: Record<string, unknown> })[]>>
  }

  /** Add models to the recycle pool keyed by `key`. */
  recycle<M extends object>(models: M | readonly M[], key: string): Factory<T> {
    const list: readonly object[] = Array.isArray(models) ? models : [models]
    const next = new Map(this.internals.recycle)
    next.set(key, list)
    return this.clone({ recycle: next })
  }

  /** Pick a random recycled model from `key`, or undefined. */
  getRecycled(key: string): object | undefined {
    const pool = this.internals.recycle.get(key)
    if (!pool || pool.length === 0) return undefined
    const idx = this.internals.faker.rawPrng().int(0, pool.length - 1)
    return pool[idx]
  }

  // -------------------------------------------------------------------------
  // Hooks + persistence
  // -------------------------------------------------------------------------

  /** Register a hook fired after each item is built. */
  afterMaking(fn: Hook<T>): Factory<T> {
    return this.clone({ afterMaking: [...this.internals.afterMaking, fn] })
  }

  /** Register a hook fired after each item is persisted via `create()`. */
  afterCreating(fn: Hook<T>): Factory<T> {
    return this.clone({ afterCreating: [...this.internals.afterCreating, fn] })
  }

  /** Set or replace the persistence callback used by `create()`. */
  persist(fn: Persist<T>): Factory<T> {
    return this.clone({ persist: fn })
  }

  // -------------------------------------------------------------------------
  // Faker control (per-factory determinism)
  // -------------------------------------------------------------------------

  /**
   * Bind this factory to its own private `Faker` instance, seeded as given.
   * Useful when one factory in a suite must be deterministic without
   * affecting the shared default faker.
   *
   * The seed is re-applied at the start of every terminal call, so a seeded
   * factory reproduces on repeat builds and across sibling clones rather than
   * handing each one whatever PRNG state the previous build left behind.
   * Any locale already chosen in the chain is preserved.
   */
  seed(seed: number): Factory<T> {
    return this.clone({
      faker: this.privateFaker(seed, this.internals.localeName),
      ownsFaker: true,
      seedValue: seed,
    })
  }

  /**
   * Set the locale for this factory's data. Returns a factory with its own
   * private, freshly built `Faker` — the source factory and any sibling
   * clones keep the locale they were built with. Any seed already set in the
   * chain is preserved, so `.locale(l).seed(n)` and `.seed(n).locale(l)`
   * describe the same factory.
   */
  locale(name: string): Factory<T> {
    return this.clone({
      faker: this.privateFaker(this.internals.seedValue, name),
      ownsFaker: true,
      localeName: name,
    })
  }

  // -------------------------------------------------------------------------
  // Terminal methods
  // -------------------------------------------------------------------------

  /** Build a single item (ignoring `count`). */
  makeOne(): T {
    const item = this.buildOne(0, this.beginBuild())
    this.fireAfterMakingSync([item])
    return item
  }

  /** Build `count` items. */
  makeMany(): T[] {
    const items = this.buildMany()
    this.fireAfterMakingSync(items)
    return items
  }

  /**
   * Build — single item when `count === 1`, array otherwise.
   * Use {@link makeOne} / {@link makeMany} when you need a specific shape.
   */
  make(): T | T[] {
    return this.internals.count === 1 ? this.makeOne() : this.makeMany()
  }

  /** Raw attribute objects with the same shape as `make()`. */
  raw(): T | T[] {
    return this.make()
  }

  /** Build and return as a {@link Collection}. */
  collect(): Collection<T> {
    return new Collection(this.makeMany())
  }

  /**
   * Build and persist via the registered persistence callback.
   * Returns single item when `count === 1`, array otherwise.
   */
  async create(): Promise<T | T[]> {
    const persist = this.internals.persist
    if (!persist) {
      throw new Error(
        '[Factory] create(): no persistence callback registered. Use .persist(fn) or pass one to defineFactory().',
      )
    }
    const items = this.buildMany()
    await this.runHooks(items, this.internals.afterMaking)
    const persisted = await Promise.all(items.map((item) => Promise.resolve(persist(item))))
    await this.runHooks(persisted, this.internals.afterCreating)
    return this.internals.count === 1 ? (persisted[0] as T) : persisted
  }

  /** Always-array variant of {@link create}. */
  async createMany(): Promise<T[]> {
    const result = await this.create()
    return Array.isArray(result) ? result : [result]
  }

  // -------------------------------------------------------------------------
  // Build engine
  // -------------------------------------------------------------------------

  /**
   * Prepare the mutable state a single terminal call consumes, and return the
   * sequence cursors to draw from.
   *
   * Both halves exist to keep a terminal call from mutating its receiver: the
   * PRNG is rewound so a seeded factory yields the same data on every call and
   * in every clone that shares the instance, and sequences are drawn from
   * throwaway copies so `.makeMany()` twice does not continue where it left off.
   */
  private beginBuild(): Sequence<T>[] {
    const { faker, ownsFaker, seedValue } = this.internals
    // Only rewind a factory that asked to be deterministic — reseeding an
    // unseeded one would turn every build into the same "random" data.
    if (ownsFaker && seedValue !== null) faker.seed(seedValue)
    return this.internals.sequences.map((s) => s.clone())
  }

  private buildOne(index: number, sequences: readonly Sequence<T>[]): T {
    const seq = index + 1
    const ctx: BuildContext = { seq, faker: this.internals.faker }

    // Install this factory's faker for the whole pass so builder helpers
    // (`oneOf`, `maybe`, `array`) — which take no arguments and so cannot
    // reach `ctx` — resolve against it instead of the shared default
    // singleton. Without this, `seed()` would leave them non-reproducible.
    // Child factories built by relations below nest and restore correctly.
    return withFaker(this.internals.faker, () => {
      let item = this.definition(ctx)

      for (const stateName of this.internals.activeStates) {
        const state = this.internals.states.get(stateName)
        if (!state) continue
        item = { ...item, ...(typeof state === 'function' ? state(item, ctx) : state) }
      }

      for (const sequence of sequences) {
        item = { ...item, ...sequence.next() }
      }

      for (const [field, values] of this.internals.fieldSequences) {
        // fieldSequence() rejects empty lists, so the modulo is always safe.
        const value = values[index % values.length]
        item = { ...item, [field]: value }
      }

      item = { ...item, ...this.internals.overrides }

      // Definitions, states, sequences and overrides may all contribute
      // `lazy(() => …)` markers. Resolve once the merges are done, so a later
      // layer can still overwrite an earlier lazy field without evaluating it.
      item = resolveLazyFields(item)

      for (const rel of this.internals.hasRelations) {
        const children = rel.factory.count(rel.count).make()
        const arr = Array.isArray(children) ? children : [children]
        item = { ...item, [rel.key as string]: arr }
      }

      for (const rel of this.internals.hasAttachedRelations) {
        const children = rel.factory.count(rel.count).make()
        const arr = Array.isArray(children) ? children : [children]
        const withPivot = arr.map((child: object) => {
          const pivotData = typeof rel.pivot === 'function' ? rel.pivot(item, child) : rel.pivot
          return { ...child, pivot: pivotData }
        })
        item = { ...item, [rel.key as string]: withPivot }
      }

      return item
    })
  }

  private buildMany(): T[] {
    const sequences = this.beginBuild()
    const out: T[] = []
    for (let i = 0; i < this.internals.count; i++) out.push(this.buildOne(i, sequences))
    return out
  }

  /**
   * Fire afterMaking hooks for the sync build path (`make`/`makeOne`/`makeMany`/
   * `collect`). Async hooks are kicked off without awaiting — use {@link create}
   * if you need guaranteed sequencing.
   */
  private fireAfterMakingSync(items: readonly T[]): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item === undefined) continue
      for (const hook of this.internals.afterMaking) {
        const r = hook(item, i)
        if (r instanceof Promise) r.catch(swallow)
      }
    }
  }

  private async runHooks(items: readonly T[], hooks: readonly Hook<T>[]): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item === undefined) continue
      for (const hook of hooks) await hook(item, i)
    }
  }
}

/**
 * Replace every `lazy(() => …)` marker among `item`'s own enumerable
 * properties with the value it resolves to. Copies only when there is
 * something to resolve, so the common case allocates nothing.
 */
function resolveLazyFields<T extends object>(item: T): T {
  let out: Record<string, unknown> | null = null
  for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
    if (!isLazy(value)) continue
    out ??= { ...(item as Record<string, unknown>) }
    out[key] = value.resolve()
  }
  return out === null ? item : (out as T)
}

// Sync-path afterMaking hooks intentionally fire-and-forget; this swallows
// rejections so an unrelated hook can't crash the build.
function swallow(): void {
  /* intentional no-op */
}

/** Functional alias for `Factory.define()`. */
export function defineFactory<T extends object>(
  definition: Definition<T>,
  persist?: Persist<T>,
): Factory<T> {
  return Factory.define(definition, persist)
}
