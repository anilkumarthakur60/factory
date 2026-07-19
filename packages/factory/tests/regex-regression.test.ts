import { describe, expect, it } from 'vitest'
import { Faker } from '@'

// These sweep many seeds rather than pinning one: both bugs fixed here were
// invisible under the suite's usual fixed seed and only surfaced on specific
// draws, so the regression value is in the breadth of the sweep.
const SEEDS = 300

function gen(pattern: RegExp, seed: number): string {
  return new Faker({ seed }).helpers.fromRegExp(pattern)
}

describe('generateFromRegex round-trip', () => {
  // Representative patterns covering the documented supported subset. Every
  // generated sample must be matched by the pattern it came from.
  const patterns: RegExp[] = [
    /[A-Z]{3}-\d{4}/,
    /\d{2}:\d{2}:\d{2}/,
    /[a-z]+/,
    /[a-z]*x/,
    /a?b/,
    /(?:ab)cd:ef/,
    /(?:foo|bar)-\d{1,3}/,
    /cat|dog|bird/,
    /[^abc]{4}/,
    /[a-z0-9_]{5,8}/,
    /\w{6}/,
    /\W{3}/,
    /\d{1,4}/,
    /\S{5}/,
    /\S+/,
    /\S/,
    /\s{2}/,
    /[a-z]+:\/\/example\.com/,
    /v\d+\.\d+\.\d+/,
    /(?:\d{2}-){2}\d{2}/,
  ]

  for (const pattern of patterns) {
    it(`always produces a matching sample for ${String(pattern)}`, () => {
      const anchored = new RegExp(`^(?:${pattern.source})$`)
      const failures: { seed: number; value: string }[] = []
      for (let seed = 0; seed < SEEDS; seed++) {
        const value = gen(pattern, seed)
        if (!anchored.test(value)) failures.push({ seed, value })
      }
      expect(failures).toEqual([])
    })
  }
})

describe('generateFromRegex \\S pool', () => {
  it('never emits whitespace for \\S', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      expect(gen(/\S/, seed)).toMatch(/^\S$/)
    }
  })

  it('still allows whitespace for \\W, which a space legitimately satisfies', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 600; seed++) seen.add(gen(/\W/, seed))
    expect(seen.has(' ')).toBe(true)
  })
})

describe('generateFromRegex unsupported (?…) groups', () => {
  // The old parser searched the whole remaining pattern for ':' and jumped past
  // it, destroying every atom in between. Content outside the group must survive.
  it('keeps the text after a lookahead when a literal colon follows', () => {
    for (let seed = 0; seed < 50; seed++) {
      const value = gen(/(?=x)\d{2}:\d{2}/, seed)
      expect(value).toMatch(/\d{2}:\d{2}$/)
    }
  })

  it('keeps both halves of a named-group pattern separated by a colon', () => {
    for (let seed = 0; seed < 50; seed++) {
      const value = gen(/(?<h>\d{2}):(?<m>\d{2})/, seed)
      expect(value).toContain(':')
      expect(value).toMatch(/\d{2}:/)
      expect(value).toMatch(/\d{2}$/)
    }
  })

  it('keeps the text after a negative lookahead', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(gen(/(?!no)[a-z]{3}:[a-z]{3}/, seed)).toMatch(/[a-z]{3}:[a-z]{3}$/)
    }
  })

  it('still treats (?:…) as a plain non-capturing group', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(gen(/(?:ab)cd:ef/, seed)).toBe('abcd:ef')
    }
  })
})
