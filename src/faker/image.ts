import type { Prng } from '@/prng/types'

/**
 * Image-URL generators. No bytes are produced — just predictable URLs that
 * resolve to real images from public providers.
 *
 * @example
 * ```ts
 * faker.image.url()                 // picsum.photos URL
 * faker.image.avatar()              // ui-avatars URL
 * faker.image.dataUri(64, 64)       // tiny embeddable PNG
 * ```
 */
export class Image {
  constructor(private readonly rng: Prng) {}

  /** Picsum-photos placeholder URL. */
  url(width = 640, height = 480): string {
    const random = this.rng.int(1, 10_000).toString()
    return `https://picsum.photos/${width.toString()}/${height.toString()}?random=${random}`
  }

  /** ui-avatars.com avatar URL — needs a name to render initials. */
  avatar(name = 'User'): string {
    const params = new URLSearchParams({
      name,
      size: String(this.rng.pick([64, 96, 128, 256])),
      background: this.rng.int(0, 0xffffff).toString(16).padStart(6, '0'),
      color: 'fff',
    })
    return `https://ui-avatars.com/api/?${params.toString()}`
  }

  /** Tiny single-color PNG data-uri — useful for testing inline-image flows. */
  dataUri(width = 1, height = 1): string {
    // Solid 1x1 PNG is a well-known constant — wider sizes use the same pixel
    // for simplicity (the goal is a syntactically valid data-uri, not a
    // rasterised image).
    void width
    void height
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
  }
}
