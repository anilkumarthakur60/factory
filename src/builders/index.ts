import { faker } from '../faker'

/**
 * Pick one value from `choices` at call time. Reads from the default faker.
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
  return faker.helpers.arrayElement(choices)
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
  return faker.helpers.maybe(value, chance)
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
  const length = faker.helpers.arrayElement(
    Array.from({ length: maxOrFn - min + 1 }, (_, i) => min + i),
  )
  return Array.from({ length }, (_, i) => fn(i))
}

/**
 * Defer evaluation until the value is actually read. Inside factory
 * definitions you rarely need this (the definition is a function already),
 * but it's useful for sequence entries and state values.
 */
export function lazy<T>(fn: () => T): { resolve(): T } {
  return { resolve: fn }
}
