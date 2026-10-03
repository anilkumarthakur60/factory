import type { Prng } from '@/prng/types'
import type { LocaleRef } from './locale'
import type { StringGen } from './string'

/**
 * Filesystem / operating-system generators.
 *
 * @example
 * ```ts
 * faker.system.fileName()       // "amber-cedar-pine.json"
 * faker.system.commonFileExt()  // "pdf"
 * faker.system.mimeType()       // "image/png"
 * faker.system.filePath()       // "/var/log/glass-stone.txt"
 * ```
 */
export class System {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
    private readonly strings: StringGen,
  ) {}

  commonFileExt(): string {
    return this.rng.pick(this.locale.data.fileExtensions)
  }

  fileExt(): string {
    return this.rng.pick(this.locale.data.fileExtensions)
  }

  fileName(opts: { withExt?: boolean } = {}): string {
    const base = this.strings.slug(this.rng.int(2, 4))
    return opts.withExt === false ? base : `${base}.${this.commonFileExt()}`
  }

  directoryPath(): string {
    const depth = this.rng.int(1, 4)
    return '/' + Array.from({ length: depth }, () => this.strings.slug(1)).join('/')
  }

  filePath(): string {
    return `${this.directoryPath()}/${this.fileName()}`
  }

  mimeType(): string {
    return this.rng.pick(this.locale.data.mimeTypes)
  }

  semver(): string {
    return [this.rng.int(0, 10), this.rng.int(0, 20), this.rng.int(0, 100)].join('.')
  }
}
