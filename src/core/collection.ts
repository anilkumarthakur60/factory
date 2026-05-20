/**
 * Immutable iterable wrapper around an array, with Laravel-style helpers.
 *
 * @example
 * ```ts
 * const users = new Collection(userArray)
 * users.where(u => u.active).count()
 * users.pluck('email').toArray()
 * for (const u of users) console.log(u.name)
 * ```
 */
export class Collection<T> implements Iterable<T> {
  /** Underlying frozen items. */
  readonly items: readonly T[]

  constructor(items: Iterable<T> = []) {
    this.items = Object.freeze([...items])
  }

  /** Number of items. */
  count(): number {
    return this.items.length
  }

  /** True when there are no items. */
  isEmpty(): boolean {
    return this.items.length === 0
  }

  /** Run `fn` for each item; returns the collection for chaining. */
  each(fn: (item: T, index: number) => void): this {
    this.items.forEach(fn)
    return this
  }

  /** Project to a new collection via `fn`. */
  map<U>(fn: (item: T, index: number) => U): Collection<U> {
    return new Collection(this.items.map(fn))
  }

  /** Pluck a single field across all items. */
  pluck<K extends keyof T>(key: K): Collection<T[K]> {
    return new Collection(this.items.map((item) => item[key]))
  }

  /** Filter to items matching `predicate`. */
  where(predicate: (item: T, index: number) => boolean): Collection<T> {
    return new Collection(this.items.filter(predicate))
  }

  /** First item matching predicate (or first overall if no predicate). */
  first(predicate?: (item: T, index: number) => boolean): T | undefined {
    if (!predicate) return this.items[0]
    return this.items.find(predicate)
  }

  /** Last item in the collection. */
  last(): T | undefined {
    return this.items[this.items.length - 1]
  }

  /** Sort by a key or comparator, returning a new collection. */
  sortBy(key: keyof T, direction: 'asc' | 'desc' = 'asc'): Collection<T> {
    const sorted = [...this.items].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (av === bv) return 0
      const cmp = av < bv ? -1 : 1
      return direction === 'asc' ? cmp : -cmp
    })
    return new Collection(sorted)
  }

  /** Group items into a `Map` keyed by `fn`. */
  groupBy<K>(fn: (item: T) => K): Map<K, T[]> {
    const out = new Map<K, T[]>()
    for (const item of this.items) {
      const key = fn(item)
      const bucket = out.get(key)
      if (bucket) bucket.push(item)
      else out.set(key, [item])
    }
    return out
  }

  /** Reduce to a single value. */
  reduce<U>(fn: (acc: U, item: T, index: number) => U, initial: U): U {
    return this.items.reduce(fn, initial)
  }

  /** Plain-array view (a copy — the collection's storage is frozen). */
  toArray(): T[] {
    return [...this.items]
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]()
  }
}
