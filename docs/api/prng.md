# PRNG

The package's random output flows through a single seedable generator. Swap implementations without touching consumer code.

## `Prng` interface

```ts
interface Prng {
  readonly currentSeed: number
  seed(seed: number): void
  next(): number // [0, 1)
  int(min: number, max: number): number // [min, max] inclusive
  float(min: number, max: number, decimals?: number): number
  bool(chance?: number): boolean
  pick<T>(items: readonly T[]): T
}
```

## `Mulberry32`

The default implementation — 32-bit state, fast, deterministic, ~4 billion period. Good enough for test data and snapshots. **Not cryptographically secure.**

```ts
import { Mulberry32 } from '@anil-labs/factory'

const rng = new Mulberry32(42)
rng.int(1, 100)
rng.seed(0xdeadbeef)
```

## `createPrng(seed?)`

Convenience factory that returns a `Mulberry32` today — wrap your code in this if you might want to swap implementations later.

```ts
import { createPrng } from '@anil-labs/factory'

const rng = createPrng(7)
```

Passing `undefined` or `NaN` falls back to a time-based seed; passing `0` maps to the golden-ratio constant so the initial draw isn't a long run of small values.
