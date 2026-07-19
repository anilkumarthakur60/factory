import type { Faker } from './faker'
import { faker as defaultFaker } from './faker'

/**
 * The faker instance currently in scope for a factory build pass.
 *
 * Builder helpers (`oneOf`, `maybe`, `array`) are called *inside* a factory
 * definition but receive no arguments, so they have no way to reach the
 * factory's own `Faker`. Without this they fall back to the shared default
 * singleton — which means `Factory.seed(n)` would not make them
 * reproducible, silently breaking the library's determinism guarantee.
 *
 * `Factory.buildOne` installs its faker here for the duration of one item's
 * construction; the builders read it back via `currentFaker()`.
 */
let current: Faker | null = null

/**
 * Run `fn` with `instance` installed as the ambient faker, restoring the
 * previous one afterwards.
 *
 * Nesting is safe and required: `has()` / `for()` relations build child
 * factories partway through a parent's build, and each child has its own
 * faker. Saving and restoring the previous value keeps the parent's faker
 * in scope once the child finishes.
 *
 * Builds are synchronous, so a module-level slot cannot interleave between
 * two concurrent passes.
 */
export function withFaker<T>(instance: Faker, fn: () => T): T {
  const previous = current
  current = instance
  try {
    return fn()
  } finally {
    current = previous
  }
}

/**
 * The faker a builder helper should use: the one belonging to the factory
 * currently building, or the shared default when called outside a build
 * (e.g. `oneOf([...])` used standalone).
 */
export function currentFaker(): Faker {
  return current ?? defaultFaker
}
