import type { Prng } from '../../prng/types'
import type { LocaleRef } from '../locale'

/**
 * Color generators.
 *
 * @example
 * ```ts
 * faker.color.name()    // "amber"
 * faker.color.hex()     // "#3f8ad5"
 * faker.color.rgb()     // "rgb(63, 138, 213)"
 * faker.color.hsl()     // "hsl(217, 64%, 54%)"
 * ```
 */
export class Color {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
  ) {}

  name(): string {
    return this.rng.pick(this.locale.data.colors)
  }

  hex(): string {
    return '#' + this.rng.int(0, 0xffffff).toString(16).padStart(6, '0')
  }

  rgb(): string {
    return `rgb(${this.rng.int(0, 255)}, ${this.rng.int(0, 255)}, ${this.rng.int(0, 255)})`
  }

  hsl(): string {
    return `hsl(${this.rng.int(0, 360)}, ${this.rng.int(40, 90)}%, ${this.rng.int(30, 70)}%)`
  }
}
