/** Info passed to closure-style sequence entries. */
export interface SequenceInfo {
  /** One-based count (index + 1). */
  readonly count: number
  /** Zero-based index of this draw. */
  readonly index: number
}

/** An entry is either a literal patch or a function receiving the index info. */
export type SequenceEntry<T> = Partial<T> | ((info: SequenceInfo) => Partial<T>)

/**
 * Cycle through a list of attribute patches across generated items.
 *
 * @example
 * ```ts
 * factory.sequence([{ role: 'admin' }, { role: 'editor' }]).count(4).make()
 * // → admin, editor, admin, editor
 *
 * factory.sequence([({ index }) => ({ name: `User ${index}` })]).count(3).make()
 * // → User 0, User 1, User 2
 * ```
 */
export class Sequence<T extends object = object> {
  private cursor = 0
  private readonly entries: readonly SequenceEntry<T>[]

  constructor(entries: readonly SequenceEntry<T>[]) {
    if (entries.length === 0) {
      throw new Error('[Sequence] At least one entry is required.')
    }
    this.entries = [...entries]
  }

  /** Resolve the next patch, cycling when exhausted. */
  next(): Partial<T> {
    // Constructor guarantees entries.length > 0, so the modular index is
    // always in-bounds — the `?? throw` is a typesystem narrow, never hit.
    const entry =
      this.entries[this.cursor % this.entries.length] ??
      (() => {
        throw new Error('[Sequence] unreachable: empty entries')
      })()
    const info: SequenceInfo = { index: this.cursor, count: this.cursor + 1 }
    this.cursor++
    return typeof entry === 'function' ? entry(info) : entry
  }

  /** Reset the cursor to 0. */
  reset(): this {
    this.cursor = 0
    return this
  }

  /** Current cursor position (zero-based). */
  get currentIndex(): number {
    return this.cursor
  }

  /** Return a fresh sequence with the same entries but cursor reset. */
  clone(): Sequence<T> {
    return new Sequence([...this.entries])
  }
}

/** Functional shorthand for `new Sequence(entries)`. */
export function sequence<T extends object = object>(
  entries: readonly SequenceEntry<T>[],
): Sequence<T> {
  return new Sequence(entries)
}
