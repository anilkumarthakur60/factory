import { describe, expect, it } from 'vitest'
import { Faker, registerLocale, listLocales } from '@'

describe('Faker', () => {
  it('is reseedable + deterministic', () => {
    const f = new Faker({ seed: 7 })
    const name1 = f.person.fullName()
    const email1 = f.internet.email()
    f.seed(7)
    expect(f.person.fullName()).toBe(name1)
    expect(f.internet.email()).toBe(email1)
  })

  it('person namespace returns non-empty strings', () => {
    const f = new Faker({ seed: 1 })
    expect(f.person.firstName().length).toBeGreaterThan(0)
    expect(f.person.lastName().length).toBeGreaterThan(0)
    expect(f.person.fullName()).toMatch(/\w+ \w+/)
    expect(['male', 'female']).toContain(f.person.sex())
  })

  it('internet namespace produces well-formed strings', () => {
    const f = new Faker({ seed: 2 })
    expect(f.internet.email()).toMatch(/^[^@\s]+@[^@\s]+\.\w+$/)
    expect(f.internet.url()).toMatch(/^https:\/\//)
    expect(f.internet.ipv4()).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
    expect(f.internet.ipv6().split(':')).toHaveLength(8)
    expect(f.internet.mac().split(':')).toHaveLength(6)
    expect(f.internet.password(16)).toHaveLength(16)
  })

  it('location namespace returns plausible values', () => {
    const f = new Faker({ seed: 3 })
    expect(f.location.streetAddress()).toMatch(/\d+ \w+/)
    expect(f.location.city().length).toBeGreaterThan(0)
    expect(f.location.zipCode()).toMatch(/^\d{5}$/)
    const lat = f.location.latitude()
    expect(lat).toBeGreaterThanOrEqual(-90)
    expect(lat).toBeLessThanOrEqual(90)
  })

  it('string namespace produces UUIDs and IDs', () => {
    const f = new Faker({ seed: 4 })
    expect(f.string.uuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(f.string.nanoid(10)).toHaveLength(10)
    expect(f.string.hexadecimal(8, { prefix: '0x' })).toMatch(/^0x[0-9a-f]{8}$/)
  })

  it('number namespace covers int + float + bigInt', () => {
    const f = new Faker({ seed: 5 })
    const i = f.number.int({ min: 10, max: 20 })
    expect(i).toBeGreaterThanOrEqual(10)
    expect(i).toBeLessThanOrEqual(20)
    const fl = f.number.float({ min: 0, max: 1, decimals: 3 })
    expect(fl).toBeLessThan(1)
    const bi = f.number.bigInt({ min: 0n, max: 100n })
    expect(bi >= 0n && bi <= 100n).toBe(true)
  })

  it('date namespace returns Date instances in the right direction', () => {
    const f = new Faker({ seed: 6 })
    const past = f.date.past()
    const future = f.date.future()
    expect(past).toBeInstanceOf(Date)
    expect(past.getTime()).toBeLessThan(Date.now())
    expect(future.getTime()).toBeGreaterThan(Date.now())
  })

  it('lorem namespace builds words/sentences/paragraphs', () => {
    const f = new Faker({ seed: 8 })
    expect(f.lorem.word().length).toBeGreaterThan(0)
    expect(f.lorem.words(3).split(' ')).toHaveLength(3)
    expect(f.lorem.sentence().endsWith('.')).toBe(true)
    expect(f.lorem.paragraphs(2).split('\n\n')).toHaveLength(2)
  })

  it('color namespace returns hex / rgb / hsl', () => {
    const f = new Faker({ seed: 9 })
    expect(f.color.hex()).toMatch(/^#[0-9a-f]{6}$/)
    expect(f.color.rgb()).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    expect(f.color.hsl()).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
  })

  it('finance.creditCardNumber is Luhn-valid', () => {
    const f = new Faker({ seed: 10 })
    const card = f.finance.creditCardNumber()
    expect(card).toHaveLength(16)
    let sum = 0
    const digits: number[] = []
    for (const ch of card) digits.push(Number(ch))
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits[i]!
      if ((digits.length - i) % 2 === 0) {
        d *= 2
        if (d > 9) d -= 9
      }
      sum += d
    }
    expect(sum % 10).toBe(0)
  })

  it('helpers namespace exposes the essentials', () => {
    const f = new Faker({ seed: 11 })
    expect([1, 2, 3]).toContain(f.helpers.arrayElement([1, 2, 3]))
    expect(f.helpers.arrayElements([1, 2, 3, 4], 2)).toHaveLength(2)
    expect(f.helpers.unique(() => f.number.int({ min: 0, max: 100 }), 5)).toHaveLength(5)
    expect(f.helpers.fromRegExp(/[A-Z]{3}-\d{4}/)).toMatch(/^[A-Z]{3}-\d{4}$/)
    expect(
      f.helpers.weightedArrayElement([
        { value: 'a', weight: 99 },
        { value: 'b', weight: 1 },
      ]),
    ).toBe('a')
  })

  it('locale system registers + switches', () => {
    registerLocale('test-min', {
      title: 'Test',
      firstNames: ['Test'],
      lastNames: ['Case'],
      prefixes: ['T'],
      suffixes: ['Z'],
      streetNames: ['Test'],
      streetSuffixes: ['St'],
      cities: ['Testville'],
      states: ['TS'],
      country: 'Testland',
      countries: ['Testland'],
      emailDomains: ['test.example'],
      tlds: ['test'],
      companies: ['TestCo'],
      jobTitles: ['Tester'],
      buzzPhrases: ['test phrase'],
      productNames: ['Test Product'],
      departments: ['Test'],
      colors: ['testblue'],
      loremWords: ['testlorem'],
      mimeTypes: ['text/test'],
      fileExtensions: ['test'],
    })
    expect(listLocales()).toContain('test-min')
    const f = new Faker({ seed: 1, locale: 'test-min' })
    expect(f.person.firstName()).toBe('Test')
    expect(f.location.country()).toBe('Testland')
  })

  it('fork() returns an independent faker', () => {
    const parent = new Faker({ seed: 13 })
    const child = parent.fork()
    expect(child).not.toBe(parent)
    // Drawing from one does not affect the other.
    const parentNext = parent.number.int({ min: 0, max: 1_000_000 })
    const childNext = child.number.int({ min: 0, max: 1_000_000 })
    expect(parentNext).not.toBe(childNext)
  })
})
