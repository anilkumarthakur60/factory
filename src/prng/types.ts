/**
 * Pseudo-random number generator interface.
 *
 * All randomness in the package flows through this single contract — swap
 * the implementation (`Mulberry32`, `Sfc32`, an external PRNG) without
 * touching any consumer code.
 */
export interface Prng {
  /** Reseed the generator. Resets the internal state to the new seed. */
  seed(seed: number): void

  /** Float in `[0, 1)` — the primitive every other method derives from. */
  next(): number

  /** Integer in `[min, max]` inclusive. */
  int(min: number, max: number): number

  /** Float in `[min, max)` with `decimals` fixed digits. */
  float(min: number, max: number, decimals?: number): number

  /** Boolean with probability `chance` of `true` (default 0.5). */
  bool(chance?: number): boolean

  /** Pick a random element from a non-empty array. */
  pick<T>(items: readonly T[]): T

  /** Read the current seed (useful for snapshot / debug). */
  readonly currentSeed: number
}
