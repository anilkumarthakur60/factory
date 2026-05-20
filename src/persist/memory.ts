import type { Persist } from '../core/types'

/**
 * In-memory persistence store. Each call appends to a shared array and
 * returns the item with an auto-assigned `id` if it didn't have one.
 *
 * Built for unit-tests of business logic that consumes "persisted" entities
 * without involving a real backend.
 *
 * @example
 * ```ts
 * import { memoryPersist } from '@anil-labs/factory'
 *
 * const store = memoryPersist<User>()
 * const UserFactory = defineFactory<User>(...).persist(store)
 * await UserFactory.count(3).create()
 * store.all()              // → 3 users
 * store.find(1)            // → first user
 * ```
 */
export function memoryPersist<T extends { id?: number | string }>(): Persist<T> & {
  all(): T[]
  find(id: T['id']): T | undefined
  reset(): void
} {
  let nextId = 1
  let items: T[] = []

  const persist: Persist<T> = (item) => {
    const withId = item.id !== undefined ? item : { ...item, id: nextId++ }
    items.push(withId)
    return withId
  }

  return Object.assign(persist, {
    all: (): T[] => [...items],
    find: (id: T['id']): T | undefined => items.find((it) => it.id === id),
    reset: (): void => {
      items = []
      nextId = 1
    },
  })
}
