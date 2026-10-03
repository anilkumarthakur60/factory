import { currentFaker } from '@/faker/context'

/**
 * Pick one value from `choices` at call time. Reads from the faker of the
 * factory currently building, so `Factory.seed(n)` makes the choice
 * reproducible; outside a build it falls back to the default faker.
 * Use inside factory definitions to express "any of these".
 *
 * @example
 * ```ts
 * defineFactory<User>(({ faker }) => ({
 *   role: oneOf(['admin', 'editor', 'viewer']),
 * }))
 * ```
 */
export function oneOf<T>(choices: readonly T[]): T {
  return currentFaker().helpers.arrayElement(choices)
}

/**
 * Return `value` with probability `chance`, else `undefined`. Useful for
 * optional fields.
 *
 * @example
 * ```ts
 * { bio: maybe(faker.lorem.sentence(), 0.6) }
 * ```
 */
export function maybe<T>(value: T, chance = 0.5): T | undefined {
  return currentFaker().helpers.maybe(value, chance)
}

/**
 * Build an array of length `[min, max]` (inclusive) by calling `fn(index)`.
 * If only `min` is given, the length is exactly `min`.
 *
 * @example
 * ```ts
 * { tags: array(2, 5, () => faker.lorem.word()) }
 * ```
 */
export function array<T>(
  min: number,
  maxOrFn: number | ((i: number) => T),
  fn?: (i: number) => T,
): T[] {
  if (typeof maxOrFn === 'function') {
    return Array.from({ length: min }, (_, i) => maxOrFn(i))
  }
  if (!fn) throw new Error('[builders] array(min, max, fn): missing builder function.')
  const length = currentFaker().helpers.arrayElement(
    Array.from({ length: maxOrFn - min + 1 }, (_, i) => min + i),
  )
  return Array.from({ length }, (_, i) => fn(i))
}

/**
 * Brand identifying a value produced by {@link lazy}.
 *
 * A symbol rather than a duck-typed `resolve` property: factories routinely
 * carry real user data, and an entity that legitimately owns a `resolve`
 * method must not be mistaken for a deferred value and silently replaced by
 * its return value. `Symbol.for` keeps the brand stable if the ESM and CJS
 * bundles are both loaded in one process.
 */
const LAZY: unique symbol = Symbol.for('@anil-labs/factory.lazy')

/** A deferred value produced by {@link lazy}, resolved at build time. */
export interface Lazy<T> {
  readonly [LAZY]: true
  resolve(): T
}

/**
 * Defer evaluation until the value is actually read. Inside factory
 * definitions you rarely need this (the definition is a function already),
 * but it's useful for sequence entries and state values — the factory
 * resolves any lazy field while building each item.
 *
 * @example
 * ```ts
 * factory.state('late', { token: lazy(() => randomToken()) })
 * ```
 */
export function lazy<T>(fn: () => T): Lazy<T> {
  return { [LAZY]: true, resolve: fn }
}

/** Whether `value` was produced by {@link lazy}. */
export function isLazy(value: unknown): value is Lazy<unknown> {
  return typeof value === 'object' && value !== null && LAZY in value
}
