import type { Prng } from '../prng/types'

/**
 * Primitive datatype generators.
 *
 * @example
 * ```ts
 * faker.datatype.boolean()        // true or false
 * faker.datatype.boolean(0.8)     // true with 80% probability
 * ```
 */
export class Datatype {
  constructor(private readonly rng: Prng) {}

  /** Boolean with probability `chance` of `true` (default 0.5). */
  boolean(chance = 0.5): boolean {
    return this.rng.bool(chance)
  }
}
