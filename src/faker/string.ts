import type { Prng } from '../prng/types'

const ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMERIC = '0123456789'
const ALPHANUMERIC = ALPHA + NUMERIC
const HEX = '0123456789abcdef'
const NANOID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

/**
 * String / identifier generators.
 *
 * @example
 * ```ts
 * faker.string.uuid()              // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * faker.string.nanoid()
 * faker.string.alphanumeric(8)
 * faker.string.hexadecimal(16)
 * faker.string.sample(20)          // any printable char
 * faker.string.slug()              // "dolor-sit-amet"
 * ```
 */
export class StringGen {
  constructor(private readonly rng: Prng) {}

  /** RFC-4122 v4 UUID. */
  uuid(): string {
    const bytes: number[] = []
    for (let i = 0; i < 16; i++) bytes.push(this.rng.int(0, 255))
    bytes[6] = (bytes[6]! & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80 // RFC 4122 variant
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  }

  /** URL-safe random ID — same alphabet as nanoid. */
  nanoid(length = 21): string {
    return this.pickFrom(NANOID, length)
  }

  alpha(length = 10): string {
    return this.pickFrom(ALPHA, length)
  }

  numeric(length = 10): string {
    return this.pickFrom(NUMERIC, length)
  }

  alphanumeric(length = 10): string {
    return this.pickFrom(ALPHANUMERIC, length)
  }

  hexadecimal(length = 8, opts: { prefix?: string } = {}): string {
    return (opts.prefix ?? '') + this.pickFrom(HEX, length)
  }

  /** Random printable ASCII (32–126), any character. */
  sample(length = 10): string {
    let out = ''
    for (let i = 0; i < length; i++) out += String.fromCharCode(this.rng.int(33, 126))
    return out
  }

  /** Lowercase, hyphen-joined word sequence. */
  slug(words = 3, dictionary?: readonly string[]): string {
    const pool = dictionary ?? DEFAULT_SLUG_WORDS
    return Array.from({ length: words }, () => this.rng.pick(pool)).join('-')
  }

  private pickFrom(pool: string, length: number): string {
    let out = ''
    for (let i = 0; i < length; i++) out += pool[this.rng.int(0, pool.length - 1)]
    return out
  }
}

const DEFAULT_SLUG_WORDS = [
  'amber',
  'azure',
  'cedar',
  'cobalt',
  'coral',
  'dawn',
  'ember',
  'fern',
  'frost',
  'glass',
  'haven',
  'iris',
  'jade',
  'lake',
  'maple',
  'meadow',
  'nova',
  'opal',
  'pine',
  'quartz',
  'river',
  'sage',
  'silk',
  'stone',
  'tide',
  'umber',
  'velvet',
  'wave',
  'xeno',
  'yarn',
  'zenith',
]
