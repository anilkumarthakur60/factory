import type { Prng } from '../prng/types'
import type { LocaleRef } from './locale'

/** Capitalise the first character of a string. */
function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

/**
 * Lorem-ipsum text generator.
 *
 * @example
 * ```ts
 * faker.lorem.word()              // "consectetur"
 * faker.lorem.words(3)            // "dolor sit amet"
 * faker.lorem.sentence()          // "Ut labore et dolore magna aliqua."
 * faker.lorem.paragraph()
 * faker.lorem.paragraphs(3)
 * ```
 */
export class Lorem {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
  ) {}

  word(): string {
    return this.rng.pick(this.locale.data.loremWords)
  }

  words(count = 3): string {
    return Array.from({ length: count }, () => this.word()).join(' ')
  }

  sentence(wordCount?: number): string {
    const count = wordCount ?? this.rng.int(4, 12)
    return capitalize(this.words(count)) + '.'
  }

  paragraph(sentenceCount?: number): string {
    const count = sentenceCount ?? this.rng.int(3, 6)
    return Array.from({ length: count }, () => this.sentence()).join(' ')
  }

  paragraphs(count = 3): string {
    return Array.from({ length: count }, () => this.paragraph()).join('\n\n')
  }

  /** Alias of `paragraph()` — matches faker.js. */
  text(): string {
    return this.paragraph()
  }
}
