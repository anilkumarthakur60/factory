import type { Prng } from '@/prng/types'
import { generateFromRegex } from './regex'

export interface WeightedItem<T> {
  /** The value to potentially return. */
  readonly value: T
  /** Relative weight; need not sum to 1. */
  readonly weight: number
}

export interface UniqueOptions {
  /** Maximum number of attempts before giving up. Defaults to `count * 10`. */
  maxRetries?: number
}

/**
 * General helpers — operate on arbitrary inputs, not tied to any locale or
 * faker namespace.
 *
 * @example
 * ```ts
 * faker.helpers.arrayElement([1, 2, 3])           // 2
 * faker.helpers.arrayElements([1, 2, 3, 4], 2)    // [3, 1]
 * faker.helpers.shuffle([1, 2, 3])                // [2, 3, 1]
 * faker.helpers.weightedArrayElement([
 *   { value: 'rare',   weight: 1 },
 *   { value: 'common', weight: 9 },
 * ])
 * faker.helpers.fromRegExp(/[A-Z]{3}\d{4}/)       // "PWB7401"
 * faker.helpers.unique(() => faker.internet.email(), 5)
 * ```
 */
export class Helpers {
  constructor(private readonly rng: Prng) {}

  arrayElement<T>(items: readonly T[]): T {
    return this.rng.pick(items)
  }

  /** Pick `count` distinct elements from `items` (no replacement). */
  arrayElements<T>(items: readonly T[], count?: number): T[] {
    const n = count ?? this.rng.int(1, items.length)
    if (n > items.length) {
      throw new Error(`[Helpers] arrayElements: requested ${n} from ${items.length} items.`)
    }
    return this.shuffle(items).slice(0, n)
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i)
      const a = copy[i]!
      const b = copy[j]!
      copy[i] = b
      copy[j] = a
    }
    return copy
  }

  weightedArrayElement<T>(items: readonly WeightedItem<T>[]): T {
    if (items.length === 0) throw new Error('[Helpers] weightedArrayElement: empty list.')
    const total = items.reduce((acc, it) => acc + it.weight, 0)
    if (total <= 0) throw new Error('[Helpers] weightedArrayElement: weights sum to <= 0.')
    let target = this.rng.next() * total
    for (const it of items) {
      target -= it.weight
      if (target <= 0) return it.value
    }
    return items[items.length - 1]!.value
  }

  /** Build an array of length `length` by calling `fn(index)`. */
  multiple<T>(length: number, fn: (index: number) => T): T[] {
    return Array.from({ length }, (_, i) => fn(i))
  }

  /** Repeat a string `count` times. */
  repeat(value: string, count: number): string {
    return value.repeat(count)
  }

  /** Sample-string matching a regex. */
  fromRegExp(pattern: RegExp | string): string {
    return generateFromRegex(pattern, this.rng)
  }

  /**
   * Collect `count` unique results from `fn`. Throws if the retry budget is
   * exhausted before reaching `count`.
   */
  unique<T>(fn: () => T, count: number, options: UniqueOptions = {}): T[] {
    const out = new Set<T>()
    const budget = options.maxRetries ?? count * 10
    let attempts = 0
    while (out.size < count && attempts < budget) {
      out.add(fn())
      attempts++
    }
    if (out.size < count) {
      throw new Error(
        `[Helpers] unique: could not produce ${count} unique values after ${budget} attempts (got ${out.size}).`,
      )
    }
    return [...out]
  }

  /** Pick a random `enum` value, handling numeric reverse-mappings. */
  enumValue<T>(enumObj: Record<string, T>): T {
    const numericKeys = Object.keys(enumObj).filter((k) => /^\d+$/.test(k))
    const values =
      numericKeys.length > 0 ? (numericKeys.map((k) => enumObj[k]) as T[]) : Object.values(enumObj)
    if (values.length === 0) throw new Error('[Helpers] enumValue: enum has no values.')
    return this.rng.pick(values)
  }

  /** With probability `chance`, return `value`; otherwise `undefined`. */
  maybe<T>(value: T, chance = 0.5): T | undefined {
    return this.rng.bool(chance) ? value : undefined
  }
}
