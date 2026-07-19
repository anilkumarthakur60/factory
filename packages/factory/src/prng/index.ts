export type { Prng } from './types'
export { Mulberry32 } from './mulberry32'

import { Mulberry32 } from './mulberry32'
import type { Prng } from './types'

/** Construct a default PRNG (currently Mulberry32). */
export function createPrng(seed?: number): Prng {
  return new Mulberry32(seed)
}
