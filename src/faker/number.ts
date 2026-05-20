import type { Prng } from '../prng/types'

/**
 * Number generators.
 *
 * @example
 * ```ts
 * faker.number.int({ min: 1, max: 100 })
 * faker.number.float({ min: 0, max: 1, decimals: 3 })
 * faker.number.bigInt({ min: 0n, max: 1000n })
 * faker.number.between(1, 5)
 * ```
 */
export class NumberGen {
  constructor(private readonly rng: Prng) {}

  int(opts: { min?: number; max?: number } = {}): number {
    return this.rng.int(opts.min ?? 0, opts.max ?? Number.MAX_SAFE_INTEGER)
  }

  float(opts: { min?: number; max?: number; decimals?: number } = {}): number {
    return this.rng.float(opts.min ?? 0, opts.max ?? 1, opts.decimals ?? 2)
  }

  bigInt(opts: { min?: bigint; max?: bigint } = {}): bigint {
    const min = opts.min ?? 0n
    const max = opts.max ?? 1_000_000_000n
    if (max < min) throw new Error('[Number] bigInt: max < min')
    const range = max - min + 1n
    // Compose a bigint from two 32-bit ints to cover up to 64 bits.
    const lo = BigInt(this.rng.int(0, 0xffffffff))
    const hi = BigInt(this.rng.int(0, 0xffffffff))
    const composed = (hi << 32n) | lo
    return min + (composed % range)
  }

  /** Convenience: integer in `[min, max]`. */
  between(min: number, max: number): number {
    return this.rng.int(min, max)
  }
}
