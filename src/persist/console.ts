import type { Persist } from '@/core/types'

/**
 * Logging persistence — prints each item to the console and returns it
 * unchanged. Handy when wiring up a factory and you want to inspect what
 * `create()` would send before pointing it at a real backend.
 *
 * The factory wraps in `<T>()` so it satisfies `Persist<T>` for any model
 * type without losing the model's static type.
 *
 * @example
 * ```ts
 * UserFactory.persist(consolePersist()).create()
 * ```
 */
export function consolePersist<T>(label = '[consolePersist]'): Persist<T> {
  return (item: T): T => {
    console.log(label, item)
    return item
  }
}
