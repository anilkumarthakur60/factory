import type { Factory } from './factory'

/**
 * Process-global registry that lets you look up factories by name.
 * Mirrors how Laravel resolves `UserFactory` from `User::factory()`.
 *
 * @example
 * ```ts
 * FactoryRegistry.register('User', UserFactory)
 * const f = FactoryRegistry.resolve<User>('User')
 * f.count(5).make()
 * ```
 */
export const FactoryRegistry = {
  register<T extends object>(name: string, factory: Factory<T>): void {
    registry.set(name, factory as unknown as Factory<object>)
  },

  resolve<T extends object>(name: string): Factory<T> {
    const f = registry.get(name)
    if (!f) {
      throw new Error(
        `[FactoryRegistry] No factory registered as "${name}". Registered: ${[...registry.keys()].join(', ')}`,
      )
    }
    return f as unknown as Factory<T>
  },

  has(name: string): boolean {
    return registry.has(name)
  },

  unregister(name: string): boolean {
    return registry.delete(name)
  },

  clear(): void {
    registry.clear()
  },

  names(): string[] {
    return [...registry.keys()]
  },
}

const registry = new Map<string, Factory<object>>()
