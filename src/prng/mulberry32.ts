import type { Prng } from './types'

/**
 * Mulberry32 — 32-bit, ~4 billion period, very fast, deterministic.
 *
 * Good enough for test data and snapshots. NOT cryptographically secure.
 *
 * @see https://gist.github.com/tommyettinger/46a3b8f97c8e3a59e1e0c7f8e85bcde6
 */
export class Mulberry32 implements Prng {
  private state: number

  constructor(seed?: number) {
    this.state = normalizeSeed(seed)
  }

  get currentSeed(): number {
    return this.state >>> 0
  }

  seed(seed: number): void {
    this.state = normalizeSeed(seed)
  }

  next(): number {
    // The classic Mulberry32 step.
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }

  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min]
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  float(min: number, max: number, decimals = 2): number {
    const v = this.next() * (max - min) + min
    const factor = 10 ** decimals
    return Math.round(v * factor) / factor
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('[Prng] pick(): array is empty.')
    }
    return items[this.int(0, items.length - 1)]!
  }
}

/**
 * Coerce any input into a non-zero 32-bit unsigned integer. We map `0` to the
 * golden-ratio constant so callers passing `0` get a deterministic-but-non-zero
 * starting state (zero would emit a long initial run of small numbers).
 */
function normalizeSeed(seed: number | undefined): number {
  if (typeof seed !== 'number' || Number.isNaN(seed)) {
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
  }
  const truncated = Math.trunc(seed) >>> 0
  return truncated === 0 ? 0x9e3779b9 : truncated
}
