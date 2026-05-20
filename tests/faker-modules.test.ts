import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Faker, consolePersist, getLocale, listLocales, registerLocale } from '@'
import type { LocaleData } from '@'

// All tests share a fixed seed so failures pinpoint a real regression, not a
// flaky PRNG draw. Each module gets its own `Faker` to isolate side effects.
const SEED = 1234

function faker(): Faker {
  return new Faker({ seed: SEED })
}

describe('faker.commerce', () => {
  const f = faker()

  it('productName / department return non-empty locale strings', () => {
    expect(f.commerce.productName()).toMatch(/\S/)
    expect(f.commerce.department()).toMatch(/\S/)
  })

  it('price respects [min, max] and decimals', () => {
    const p = f.commerce.price(10, 20, 2)
    expect(p).toBeGreaterThanOrEqual(10)
    expect(p).toBeLessThanOrEqual(20)
    // Two decimal places at most.
    expect(p.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
  })

  it('productDescription embeds a known adjective', () => {
    const d = f.commerce.productDescription()
    expect(d).toMatch(/(Premium|Eco-friendly|Hand-crafted|Vintage|Modern)/)
    expect(d).toMatch(/designed for everyday use\.$/)
  })
})

describe('faker.company', () => {
  const f = faker()

  it('name / jobTitle / buzzPhrase return non-empty strings', () => {
    expect(f.company.name()).toMatch(/\S/)
    expect(f.company.jobTitle()).toMatch(/\S/)
    expect(f.company.buzzPhrase()).toMatch(/\S/)
  })
})

describe('faker.date', () => {
  const f = faker()
  const NOW = 1_700_000_000_000

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('past / recent return a Date before now', () => {
    expect(f.date.past().getTime()).toBeLessThan(NOW)
    expect(f.date.recent().getTime()).toBeLessThan(NOW)
  })

  it('future / soon return a Date after now', () => {
    expect(f.date.future().getTime()).toBeGreaterThan(NOW)
    expect(f.date.soon().getTime()).toBeGreaterThan(NOW)
  })

  it('between(a, b) lands inside the range (any order)', () => {
    const a = new Date(NOW - 1_000_000)
    const b = new Date(NOW + 1_000_000)
    const d = f.date.between(b, a) // intentionally reversed
    expect(d.getTime()).toBeGreaterThanOrEqual(a.getTime())
    expect(d.getTime()).toBeLessThanOrEqual(b.getTime())
  })

  it('iso returns an ISO-8601 string in the past', () => {
    const s = f.date.iso(7)
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(new Date(s).getTime()).toBeLessThan(NOW)
  })

  it('birthdate respects min/max age', () => {
    const d = f.date.birthdate({ min: 20, max: 30 })
    const ageMs = NOW - d.getTime()
    const ageYears = ageMs / (365 * 86_400_000)
    expect(ageYears).toBeGreaterThanOrEqual(20)
    expect(ageYears).toBeLessThanOrEqual(30)
  })

  it('birthdate defaults to 18..80', () => {
    const d = f.date.birthdate()
    const ageYears = (NOW - d.getTime()) / (365 * 86_400_000)
    expect(ageYears).toBeGreaterThanOrEqual(18)
    expect(ageYears).toBeLessThanOrEqual(80)
  })
})

describe('faker.datatype', () => {
  const f = faker()

  it('boolean returns a boolean', () => {
    expect(typeof f.datatype.boolean()).toBe('boolean')
  })

  it('boolean(0) is always false, boolean(1) is always true', () => {
    expect(f.datatype.boolean(0)).toBe(false)
    expect(f.datatype.boolean(1)).toBe(true)
  })
})

describe('faker.finance', () => {
  const f = faker()

  it('amount() returns a numeric string with the default decimals', () => {
    const a = f.finance.amount()
    expect(a).toMatch(/^\d+\.\d{2}$/)
  })

  it('amount(min, max, dec, symbol) honours all four args', () => {
    const a = f.finance.amount(0, 10, 3, '$')
    expect(a).toMatch(/^\$\d+\.\d{3}$/)
    const numeric = Number(a.slice(1))
    expect(numeric).toBeGreaterThanOrEqual(0)
    expect(numeric).toBeLessThanOrEqual(10)
  })

  it('accountNumber returns a numeric string of the requested length', () => {
    expect(f.finance.accountNumber()).toMatch(/^\d{10}$/)
    expect(f.finance.accountNumber(16)).toMatch(/^\d{16}$/)
  })

  it('currencyCode returns a known ISO-style code', () => {
    expect(f.finance.currencyCode()).toMatch(/^[A-Z]{3}$/)
  })

  it('iban returns a string starting with country code + 2 check digits', () => {
    const v = f.finance.iban()
    expect(v).toMatch(/^GB\d{2}\d+/)
    expect(v.length).toBe(22)
  })

  it('iban with custom country code and length', () => {
    const v = f.finance.iban('NP', 16)
    expect(v.startsWith('NP')).toBe(true)
    expect(v.length).toBe(16)
  })

  it('bitcoinAddress starts with 1 or 3 and has plausible length', () => {
    const b = f.finance.bitcoinAddress()
    expect(b[0]).toMatch(/^[13]$/)
    expect(b.length).toBeGreaterThanOrEqual(25)
    expect(b.length).toBeLessThanOrEqual(33)
  })
})

describe('faker.image', () => {
  const f = faker()

  it('url returns a picsum URL with dimensions + cache-buster', () => {
    const u = f.image.url()
    expect(u).toMatch(/^https:\/\/picsum\.photos\/\d+\/\d+\?random=\d+$/)
  })

  it('url accepts custom dimensions', () => {
    expect(f.image.url(100, 200)).toContain('/100/200?')
  })

  it('avatar returns a ui-avatars URL with a name', () => {
    const a = f.image.avatar('Anil')
    expect(a).toMatch(/^https:\/\/ui-avatars\.com\/api\/\?/)
    expect(a).toContain('name=Anil')
  })

  it('dataUri returns a PNG data-uri', () => {
    expect(f.image.dataUri()).toMatch(/^data:image\/png;base64,/)
    expect(f.image.dataUri(32, 32)).toMatch(/^data:image\/png;base64,/)
  })
})

describe('faker.person', () => {
  const f = faker()

  it('firstName returns from the locale list by default', () => {
    expect(f.person.firstName()).toMatch(/\S/)
  })

  it("firstName('male') / firstName('female') use the gendered lists when present", () => {
    expect(f.person.firstName('male')).toMatch(/\S/)
    expect(f.person.firstName('female')).toMatch(/\S/)
  })

  it('lastName / prefix / suffix return non-empty strings', () => {
    expect(f.person.lastName()).toMatch(/\S/)
    expect(f.person.prefix()).toMatch(/\S/)
    expect(f.person.suffix()).toMatch(/\S/)
  })

  it('fullName({ withPrefix, withSuffix }) includes the extra parts', () => {
    const name = f.person.fullName({ withPrefix: true, withSuffix: true })
    // Prefix word + first + last + suffix word = at least 4 whitespace-separated tokens.
    expect(name.split(/\s+/).length).toBeGreaterThanOrEqual(4)
  })

  it("sex() returns either 'male' or 'female'", () => {
    expect(['male', 'female']).toContain(f.person.sex())
  })
})

describe('faker.system', () => {
  const f = faker()

  it('commonFileExt / fileExt return a known extension', () => {
    expect(f.system.commonFileExt()).toMatch(/^[a-z0-9]+$/)
    expect(f.system.fileExt()).toMatch(/^[a-z0-9]+$/)
  })

  it('fileName has an extension by default', () => {
    expect(f.system.fileName()).toMatch(/^[a-z-]+\.[a-z0-9]+$/)
  })

  it('fileName({ withExt: false }) omits the extension', () => {
    expect(f.system.fileName({ withExt: false })).toMatch(/^[a-z-]+$/)
  })

  it('directoryPath starts with / and uses lowercase segments', () => {
    expect(f.system.directoryPath()).toMatch(/^(\/[a-z-]+)+$/)
  })

  it('filePath joins a directory + filename', () => {
    expect(f.system.filePath()).toMatch(/^(\/[a-z-]+)+\/[a-z-]+\.[a-z0-9]+$/)
  })

  it('mimeType matches `type/subtype`', () => {
    expect(f.system.mimeType()).toMatch(/^[a-z]+\/[a-z0-9.+-]+$/)
  })

  it('semver looks like X.Y.Z with non-negative integers', () => {
    const v = f.system.semver()
    expect(v).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('faker.location (uncovered methods)', () => {
  const f = faker()

  it('state / country / countryName return non-empty strings', () => {
    expect(f.location.state()).toMatch(/\S/)
    expect(f.location.country()).toMatch(/\S/)
    expect(f.location.countryName()).toMatch(/\S/)
  })

  it('fullAddress contains a 5-digit zip and a comma-separated structure', () => {
    const a = f.location.fullAddress()
    expect(a).toMatch(/, .+, .+ \d{5}$/)
  })

  it('latitude / longitude stay in their default ranges', () => {
    expect(f.location.latitude()).toBeGreaterThanOrEqual(-90)
    expect(f.location.latitude()).toBeLessThanOrEqual(90)
    expect(f.location.longitude()).toBeGreaterThanOrEqual(-180)
    expect(f.location.longitude()).toBeLessThanOrEqual(180)
  })

  it('latitude / longitude honour explicit min/max', () => {
    const lat = f.location.latitude(0, 1)
    expect(lat).toBeGreaterThanOrEqual(0)
    expect(lat).toBeLessThanOrEqual(1)
  })
})

describe('faker.string (uncovered methods)', () => {
  const f = faker()

  it('nanoid default + custom length', () => {
    expect(f.string.nanoid()).toHaveLength(21)
    expect(f.string.nanoid(10)).toHaveLength(10)
  })

  it('alpha / numeric / alphanumeric obey their pools', () => {
    expect(f.string.alpha(8)).toMatch(/^[a-zA-Z]{8}$/)
    expect(f.string.numeric(8)).toMatch(/^[0-9]{8}$/)
    expect(f.string.alphanumeric(12)).toMatch(/^[a-zA-Z0-9]{12}$/)
  })

  it('hexadecimal with and without prefix', () => {
    expect(f.string.hexadecimal(8)).toMatch(/^[0-9a-f]{8}$/)
    expect(f.string.hexadecimal(4, { prefix: '0x' })).toMatch(/^0x[0-9a-f]{4}$/)
  })

  it('sample yields printable ASCII of the requested length', () => {
    const s = f.string.sample(20)
    expect(s).toHaveLength(20)
    for (const ch of s) {
      const code = ch.charCodeAt(0)
      expect(code).toBeGreaterThanOrEqual(33)
      expect(code).toBeLessThanOrEqual(126)
    }
  })

  it('slug uses default dictionary + custom dictionary', () => {
    expect(f.string.slug(2)).toMatch(/^[a-z]+-[a-z]+$/)
    expect(f.string.slug(3, ['alpha', 'beta', 'gamma'])).toMatch(
      /^(alpha|beta|gamma)(-(alpha|beta|gamma)){2}$/,
    )
  })
})

describe('faker.helpers (uncovered methods)', () => {
  const f = faker()

  it('arrayElement / arrayElements pick from the pool', () => {
    const pool = ['a', 'b', 'c', 'd']
    expect(pool).toContain(f.helpers.arrayElement(pool))
    const pair = f.helpers.arrayElements(pool, 2)
    expect(pair).toHaveLength(2)
    expect(new Set(pair).size).toBe(2)
  })

  it('arrayElements throws when count exceeds pool size', () => {
    expect(() => f.helpers.arrayElements([1, 2], 5)).toThrow(/requested 5 from 2/)
  })

  it('arrayElements default count is random within pool bounds', () => {
    const out = f.helpers.arrayElements(['x', 'y', 'z'])
    expect(out.length).toBeGreaterThanOrEqual(1)
    expect(out.length).toBeLessThanOrEqual(3)
  })

  it('shuffle preserves elements but changes (typical) order', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const out = f.helpers.shuffle(input)
    const resorted = [...out].sort((a, b) => a - b)
    expect(resorted).toEqual(input)
  })

  it('weightedArrayElement skews to heavier weights', () => {
    const counts: Record<'rare' | 'common', number> = { rare: 0, common: 0 }
    for (let i = 0; i < 200; i++) {
      const v = f.helpers.weightedArrayElement([
        { value: 'rare' as const, weight: 1 },
        { value: 'common' as const, weight: 99 },
      ])
      counts[v]++
    }
    expect(counts.common).toBeGreaterThan(counts.rare * 5)
  })

  it('weightedArrayElement throws on empty list or zero weights', () => {
    expect(() => f.helpers.weightedArrayElement([])).toThrow(/empty list/)
    expect(() => f.helpers.weightedArrayElement([{ value: 'x', weight: 0 }])).toThrow(/<= 0/)
  })

  it('multiple builds an array by calling fn(i)', () => {
    expect(f.helpers.multiple(3, (i) => i * 2)).toEqual([0, 2, 4])
  })

  it('repeat repeats the string', () => {
    expect(f.helpers.repeat('ab', 3)).toBe('ababab')
  })

  it('fromRegExp generates a matching string', () => {
    const v = f.helpers.fromRegExp(/[A-Z]{3}-\d{4}/)
    expect(v).toMatch(/^[A-Z]{3}-\d{4}$/)
  })

  it('unique produces distinct values, or throws when impossible', () => {
    let n = 0
    const five = f.helpers.unique(() => n++, 5)
    expect(new Set(five).size).toBe(5)
    expect(() => f.helpers.unique(() => 7, 3, { maxRetries: 5 })).toThrow(/unique/)
  })

  it('enumValue picks from numeric-mapped + string-only enums', () => {
    enum Status {
      Active,
      Inactive,
    }
    // For numeric enums, `enumValue` strips reverse-mapped numeric keys and
    // returns the string names ('Active' / 'Inactive') — by design.
    expect(['Active', 'Inactive']).toContain(f.helpers.enumValue(Status))
    const stringEnum = { A: 'a', B: 'b' } as const
    expect(['a', 'b']).toContain(f.helpers.enumValue(stringEnum))
  })

  it('enumValue throws on empty', () => {
    expect(() => f.helpers.enumValue({})).toThrow(/no values/)
  })

  it('maybe(value, 1) always returns value; maybe(value, 0) always undefined', () => {
    expect(f.helpers.maybe('x', 1)).toBe('x')
    expect(f.helpers.maybe('x', 0)).toBeUndefined()
  })
})

describe('faker.regex (additional patterns)', () => {
  const f = faker()

  it('quantifiers: *, +, ?, {n}, {n,m}', () => {
    expect(f.helpers.fromRegExp(/a*/)).toMatch(/^a*$/)
    expect(f.helpers.fromRegExp(/a+/)).toMatch(/^a+$/)
    expect(f.helpers.fromRegExp(/a?/)).toMatch(/^a?$/)
    expect(f.helpers.fromRegExp(/a{3}/)).toMatch(/^a{3}$/)
    const v = f.helpers.fromRegExp(/a{2,4}/)
    expect(v.length).toBeGreaterThanOrEqual(2)
    expect(v.length).toBeLessThanOrEqual(4)
  })

  it('alternation + grouping', () => {
    expect(f.helpers.fromRegExp(/(?:cat|dog|bird)/)).toMatch(/^(cat|dog|bird)$/)
  })

  it('character classes: ranges + negation + escape', () => {
    expect(f.helpers.fromRegExp(/[a-c]{4}/)).toMatch(/^[a-c]{4}$/)
    expect(f.helpers.fromRegExp(/[^0-9]{3}/)).toMatch(/^[^0-9]{3}$/)
    expect(f.helpers.fromRegExp(/\d{4}/)).toMatch(/^\d{4}$/)
    expect(f.helpers.fromRegExp(/\w{6}/)).toMatch(/^\w{6}$/)
    expect(f.helpers.fromRegExp(/\s/)).toMatch(/^\s$/)
  })

  it('accepts a string source as well as a RegExp', () => {
    expect(f.helpers.fromRegExp('[A-Z]{2}')).toMatch(/^[A-Z]{2}$/)
  })

  it('escape codes: \\n \\t \\r expand to those characters', () => {
    expect(f.helpers.fromRegExp(/\n/)).toBe('\n')
    expect(f.helpers.fromRegExp(/\t/)).toBe('\t')
    expect(f.helpers.fromRegExp(/\r/)).toBe('\r')
  })
})

describe('locale registry', () => {
  const MINIMAL: LocaleData = {
    title: 'Test',
    firstNames: ['Test'],
    lastNames: ['Tester'],
    prefixes: ['Dr.'],
    suffixes: ['Jr.'],
    streetNames: ['Main'],
    streetSuffixes: ['St'],
    cities: ['Townsville'],
    states: ['TS'],
    country: 'Testland',
    countries: ['Testland'],
    tlds: ['test'],
    emailDomains: ['test.test'],
    companies: ['TestCo'],
    jobTitles: ['Tester'],
    buzzPhrases: ['test things'],
    productNames: ['Widget'],
    departments: ['Stuff'],
    colors: ['testblue'],
    loremWords: ['lorem', 'ipsum'],
    fileExtensions: ['tst'],
    mimeTypes: ['test/test'],
  }

  it('registerLocale + getLocale round-trip', () => {
    registerLocale('test-locale', MINIMAL)
    expect(getLocale('test-locale')).toBe(MINIMAL)
  })

  it('listLocales includes the registered name', () => {
    registerLocale('test-locale-2', MINIMAL)
    expect(listLocales()).toContain('test-locale-2')
  })

  it('faker.locale() switches active locale; unknown name throws', () => {
    registerLocale('test-locale-3', MINIMAL)
    const f = faker()
    f.locale('test-locale-3')
    expect(f.person.firstName()).toBe('Test')
    expect(() => f.locale('does-not-exist')).toThrow(/Unknown locale/)
  })
})

describe('consolePersist', () => {
  it('logs to console and returns the item unchanged', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const persist = consolePersist<{ id: number }>('[test]')
    const out = persist({ id: 7 })
    expect(out).toEqual({ id: 7 })
    expect(spy).toHaveBeenCalledWith('[test]', { id: 7 })
    spy.mockRestore()
  })

  it('defaults its label', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    void consolePersist<{ x: 1 }>()({ x: 1 })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('Faker — additional paths', () => {
  it('fork() yields an independent faker seeded from the parent', () => {
    const a = faker()
    const forkA = a.fork()
    const b = faker()
    const forkB = b.fork()
    // Same parent seed → same fork seed → identical draws.
    expect(forkA.string.nanoid()).toBe(forkB.string.nanoid())
  })

  it('currentSeed / currentLocale reflect the active state', () => {
    const f = new Faker({ seed: 99, locale: 'en' })
    expect(f.currentSeed()).toBe(99)
    expect(f.currentLocale()).toBe('en')
    f.seed(7)
    expect(f.currentSeed()).toBe(7)
  })
})
