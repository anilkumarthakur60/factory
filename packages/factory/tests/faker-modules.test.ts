import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  Collection,
  Faker,
  Mulberry32,
  consolePersist,
  defineFactory,
  getLocale,
  httpPersist,
  listLocales,
  memoryPersist,
  registerLocale,
} from '@'
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

describe('faker.color (uncovered methods)', () => {
  const f = faker()

  it('name returns a non-empty colour name', () => {
    expect(f.color.name()).toMatch(/\S/)
  })
})

describe('faker.lorem (uncovered methods)', () => {
  const f = faker()

  it('text is an alias of paragraph', () => {
    expect(f.lorem.text()).toMatch(/\S/)
  })

  it('words / paragraphs return non-empty strings', () => {
    expect(f.lorem.words(5).split(' ')).toHaveLength(5)
    expect(f.lorem.paragraphs(2).split('\n\n')).toHaveLength(2)
  })
})

describe('faker.internet (uncovered methods)', () => {
  const f = faker()

  it('userName returns a lowercase identifier', () => {
    const name = f.internet.userName()
    expect(name).toMatch(/^[a-z0-9._]+$/)
  })

  it('email accepts custom firstName/lastName', () => {
    const email = f.internet.email({ firstName: 'Anil', lastName: 'Thakur' })
    expect(email.toLowerCase()).toContain('anil')
    expect(email.toLowerCase()).toContain('thakur')
  })

  it('domainName / url / ipv4 / ipv6 / mac / password produce well-formed values', () => {
    expect(f.internet.domainName()).toMatch(/^[a-z]+\.[a-z]+$/i)
    expect(f.internet.url()).toMatch(/^https:\/\/(www|app|api|blog|docs)\.[a-z]+\.[a-z]+$/i)
    expect(f.internet.ipv4()).toMatch(/^\d{1,3}(\.\d{1,3}){3}$/)
    expect(f.internet.ipv6()).toMatch(/^([0-9a-f]{4}:){7}[0-9a-f]{4}$/)
    expect(f.internet.mac()).toMatch(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/)
    expect(f.internet.password(16)).toHaveLength(16)
  })
})

describe('faker.number (uncovered methods)', () => {
  const f = faker()

  it('int / float / between honour their ranges', () => {
    const i = f.number.int({ min: 5, max: 10 })
    expect(i).toBeGreaterThanOrEqual(5)
    expect(i).toBeLessThanOrEqual(10)
    const fl = f.number.float({ min: 0, max: 1, decimals: 3 })
    expect(fl).toBeGreaterThanOrEqual(0)
    expect(fl).toBeLessThanOrEqual(1)
    const b = f.number.between(1, 5)
    expect(b).toBeGreaterThanOrEqual(1)
    expect(b).toBeLessThanOrEqual(5)
  })

  it('bigInt returns a bigint inside [min, max]', () => {
    const v = f.number.bigInt({ min: 0n, max: 1000n })
    expect(typeof v).toBe('bigint')
    expect(v).toBeGreaterThanOrEqual(0n)
    expect(v).toBeLessThanOrEqual(1000n)
  })

  it('bigInt with defaults', () => {
    expect(typeof f.number.bigInt()).toBe('bigint')
  })

  it('bigInt throws when max < min', () => {
    expect(() => f.number.bigInt({ min: 10n, max: 0n })).toThrow(/max < min/)
  })
})

describe('Factory — additional paths', () => {
  it('times(n) is an alias for count(n)', () => {
    const F = defineFactory<{ id: number }>(({ seq }) => ({ id: seq }))
    expect(F.times(3).makeMany()).toHaveLength(3)
  })

  it('raw() returns the same shape as make()', () => {
    const F = defineFactory<{ id: number }>(({ seq }) => ({ id: seq }))
    expect(F.raw()).toEqual({ id: 1 })
    expect(F.count(2).raw()).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('for(parentFactory) and for(parentObject) and for(parentThunk) all set the foreign key', () => {
    interface Parent {
      id: number
    }
    interface Child {
      id: number
      parentId: number
    }
    const ParentF = defineFactory<Parent>(({ seq }) => ({ id: seq }))
    const ChildF = defineFactory<Child>(({ seq }) => ({ id: seq, parentId: 0 }))

    // 1) parent as Factory
    expect(ChildF.for(ParentF, 'parentId').makeOne().parentId).toBe(1)
    // 2) parent as plain object
    expect(ChildF.for({ id: 42 }, 'parentId').makeOne().parentId).toBe(42)
    // 3) parent as thunk
    expect(ChildF.for(() => ({ id: 99 }), 'parentId').makeOne().parentId).toBe(99)
  })

  it('locale(name) on a factory creates an isolated faker', () => {
    interface U {
      name: string
    }
    const F = defineFactory<U>(({ faker }) => ({ name: faker.person.firstName() }))
    // Just verify the chain works — switching back to 'en' is a no-op.
    expect(typeof F.locale('en').makeOne().name).toBe('string')
  })

  it('seed(n) gives reproducible output regardless of default-faker state', () => {
    const F = defineFactory<{ name: string }>(({ faker }) => ({
      name: faker.person.firstName(),
    }))
    const a = F.seed(7).makeOne()
    const b = F.seed(7).makeOne()
    expect(a).toEqual(b)
  })
})

describe('Collection — uncovered branches', () => {
  it('sortBy treats equal values as equal (returns 0)', () => {
    const c = new Collection([
      { id: 1, n: 5 },
      { id: 2, n: 5 },
      { id: 3, n: 5 },
    ])
    // All elements equal under `n` → order preserved.
    expect(c.sortBy('n').pluck('id').toArray()).toEqual([1, 2, 3])
  })

  it('sortBy descending', () => {
    const c = new Collection([{ n: 1 }, { n: 3 }, { n: 2 }])
    expect(c.sortBy('n', 'desc').pluck('n').toArray()).toEqual([3, 2, 1])
  })
})

describe('memoryPersist — uncovered branches', () => {
  it('find(id) returns undefined for unknown ids', () => {
    const store = memoryPersist<{ id?: number; name: string }>()
    void store({ name: 'a' })
    expect(store.find(999)).toBeUndefined()
  })

  it('preserves an item.id that was already present', () => {
    const store = memoryPersist<{ id?: number; name: string }>()
    const out = store({ id: 42, name: 'preset' }) as { id: number }
    expect(out.id).toBe(42)
  })
})

describe('httpPersist — error paths', () => {
  it('throws when no fetch is available', async () => {
    // Force global fetch to look absent via a fresh closure with no fetch arg.
    const original = (globalThis as { fetch?: unknown }).fetch
    ;(globalThis as { fetch?: unknown }).fetch = undefined
    try {
      const persist = httpPersist<{ id: number }>('/x')
      await expect(persist({ id: 1 })).rejects.toThrow(/No global `fetch`/)
    } finally {
      ;(globalThis as { fetch?: unknown }).fetch = original
    }
  })

  it('safeRead catches text() failure with a placeholder', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
        text: () => Promise.reject(new Error('boom')),
      }),
    )
    const persist = httpPersist<{ id: number }>('/x', { fetch: fetchMock })
    await expect(persist({ id: 1 })).rejects.toThrow(/<unreadable body>/)
  })
})

describe('Factory afterMaking — async hook rejection is swallowed', () => {
  it('does not crash when a sync make() path hook returns a rejecting Promise', async () => {
    const F = defineFactory<{ id: number }>(({ seq }) => ({ id: seq })).afterMaking(() =>
      Promise.reject(new Error('hook boom')),
    )
    // make() is sync — the rejecting promise is fire-and-forget.
    expect(() => F.makeOne()).not.toThrow()
    // Let the swallowed rejection settle so it doesn't leak into the next test.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })
})

describe('faker.lorem — empty-word edge case', () => {
  const f = faker()

  it('words(0) returns an empty string (exercises capitalize empty-string branch)', () => {
    expect(f.lorem.words(0)).toBe('')
    // sentence(0) capitalises an empty-string base and appends a period.
    expect(f.lorem.sentence(0)).toBe('.')
  })
})

describe('faker.number — defaults branch', () => {
  const f = faker()

  it('int() and float() work with no opts', () => {
    expect(typeof f.number.int()).toBe('number')
    const fl = f.number.float()
    expect(fl).toBeGreaterThanOrEqual(0)
    expect(fl).toBeLessThanOrEqual(1)
  })
})

describe('faker.regex — anchors, lazy quantifiers, dot, literals', () => {
  const f = faker()

  it('anchors ^ and $ are treated as zero-width', () => {
    expect(f.helpers.fromRegExp(/^abc$/)).toBe('abc')
  })

  it('lazy quantifier modifier `*?` is ignored, behaves like greedy', () => {
    expect(f.helpers.fromRegExp(/a*?/)).toMatch(/^a*$/)
  })

  it('lazy quantifier modifier `{2,4}?` is ignored', () => {
    const v = f.helpers.fromRegExp(/a{2,4}?/)
    expect(v.length).toBeGreaterThanOrEqual(2)
    expect(v.length).toBeLessThanOrEqual(4)
  })

  it('. (dot) yields a single word-class character or space', () => {
    expect(f.helpers.fromRegExp(/./)).toMatch(/^[\w ]$/)
  })

  it('literal escaped char (e.g. \\.) returns the literal', () => {
    expect(f.helpers.fromRegExp(/\./)).toBe('.')
  })
})

describe('faker.regex — negated escape character classes', () => {
  const f = faker()

  it('\\D yields a non-digit', () => {
    expect(f.helpers.fromRegExp(/\D/)).toMatch(/^[^0-9]$/)
  })

  it('\\W yields a non-word character', () => {
    expect(f.helpers.fromRegExp(/\W/)).toMatch(/^\W$/)
  })

  it('\\S yields a non-whitespace character', () => {
    expect(f.helpers.fromRegExp(/\S/)).toMatch(/^\S$/)
  })

  it('escape inside a character class — [\\d]+ yields digits', () => {
    expect(f.helpers.fromRegExp(/[\d]+/)).toMatch(/^\d+$/)
  })

  it('literal char inside a character class — [abc]+', () => {
    expect(f.helpers.fromRegExp(/[abc]+/)).toMatch(/^[abc]+$/)
  })
})

describe('Mulberry32 — direct PRNG paths', () => {
  it('int(max, min) swaps reversed arguments', () => {
    const p = new Mulberry32(42)
    const v = p.int(10, 1)
    expect(v).toBeGreaterThanOrEqual(1)
    expect(v).toBeLessThanOrEqual(10)
  })

  it('constructed with no seed picks a non-zero time-based seed', () => {
    const a = new Mulberry32()
    expect(a.currentSeed).toBeGreaterThan(0)
  })

  it('constructed with NaN falls back to a random seed', () => {
    const a = new Mulberry32(Number.NaN)
    expect(a.currentSeed).toBeGreaterThan(0)
  })

  it('seed(0) maps to the golden-ratio constant (never literal zero state)', () => {
    const p = new Mulberry32(0)
    expect(p.currentSeed).toBe(0x9e3779b9)
  })
})

describe('Factory — recycle + getRecycled', () => {
  it('recycle(models, key) and getRecycled(key) round-trip', () => {
    interface User {
      id: number
    }
    const F = defineFactory<User>(({ seq }) => ({ id: seq }))
    const pool = [{ id: 100 }, { id: 200 }, { id: 300 }]
    const f2 = F.recycle(pool, 'users')
    const picked = f2.getRecycled('users')
    expect(pool).toContain(picked)
  })

  it('recycle accepts a single model (non-array)', () => {
    interface User {
      id: number
    }
    const F = defineFactory<User>(({ seq }) => ({ id: seq }))
    const f2 = F.recycle({ id: 7 }, 'single')
    expect(f2.getRecycled('single')).toEqual({ id: 7 })
  })

  it('getRecycled returns undefined for an empty / unknown pool', () => {
    interface User {
      id: number
    }
    const F = defineFactory<User>(({ seq }) => ({ id: seq }))
    expect(F.getRecycled('unknown')).toBeUndefined()
    expect(F.recycle([], 'empty').getRecycled('empty')).toBeUndefined()
  })
})

describe('LocaleRef constructor — error path', () => {
  it('throws when constructed with an unknown locale', () => {
    // The default LocaleRef('en') always works; force the throw branch with
    // an unregistered name via the Faker entry-point.
    expect(() => new Faker({ locale: 'does-not-exist' })).toThrow(/Unknown locale/)
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
