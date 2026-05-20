import type { Faker } from '@/faker'

/** Context passed to definition + state callbacks. */
export interface BuildContext {
  /** One-based item index for this build. */
  readonly seq: number
  /** Shared faker instance — already seeded if the factory was. */
  readonly faker: Faker
}

/** Factory definition: returns the base attributes for a single item. */
export type Definition<T> = (ctx: BuildContext) => T

/** State function: returns an attribute patch to merge over the base. */
export type StateFn<T> = (attrs: T, ctx: BuildContext) => Partial<T>

/** State value — either an inline patch or a function returning one. */
export type StateValue<T> = Partial<T> | StateFn<T>

/** Persistence callback used by `create()`. */
export type Persist<T> = (item: T) => T | Promise<T>

/** Lifecycle hook — may be sync or async. */
export type Hook<T> = (item: T, index: number) => void | Promise<void>

/** Relation descriptor for `has()`. */
export interface HasRelation<P, C> {
  readonly kind: 'has'
  readonly factory: { make(): C[] } & { count(n: number): { make(): C[] } }
  readonly count: number
  readonly key: keyof P | string
}

/** Relation descriptor for `hasAttached()`. */
export interface HasAttachedRelation<P, C> {
  readonly kind: 'hasAttached'
  readonly factory: { make(): C[] } & { count(n: number): { make(): C[] } }
  readonly count: number
  readonly key: keyof P | string
  readonly pivot:
    | Partial<Record<string, unknown>>
    | ((parent: P, child: C) => Record<string, unknown>)
}

/** Pool of recyclable model instances, keyed by an arbitrary string. */
export type RecyclePool = ReadonlyMap<string, readonly object[]>
