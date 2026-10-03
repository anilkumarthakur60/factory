import { beforeAll, describe, expect, it } from 'vitest'
import { defineFactory } from '@/core/factory'
import { sequence } from '@/core/sequence'
import { lazy } from '@/builders'
import { en, faker, registerLocale } from '@/faker'

interface Row {
  id: number
  name: string
}

const rowDefinition = ({
  seq,
  faker,
}: {
  faker: { person: { firstName(): string } }
  seq: number
}): Row => ({
  id: seq,
  name: faker.person.firstName(),
})

const makeRowFactory = () => defineFactory<Row>(rowDefinition)

describe('seed() reproducibility across calls and clones', () => {
  it('a seeded factory yields the same data on every terminal call', () => {
    const f = makeRowFactory().seed(42).count(3)
    expect(f.makeMany()).toEqual(f.makeMany())
  })

  it('sibling clones of one seeded base each start from the seed', () => {
    const base = makeRowFactory().seed(42)
    expect(base.count(2).makeMany()).toEqual(base.count(2).makeMany())
  })

  it('sibling clones are independent of the order they are built in', () => {
    const first = makeRowFactory().seed(42)
    const x1 = first.with({ id: 100 })
    const y1 = first.with({ id: 200 })
    const xThenY = [x1.makeOne().name, y1.makeOne().name]

    const second = makeRowFactory().seed(42)
    const x2 = second.with({ id: 100 })
    const y2 = second.with({ id: 200 })
    const yFirst = y2.makeOne().name
    const xSecond = x2.makeOne().name

    // Each clone must see the seed-42 first draw regardless of who built first.
    expect([xSecond, yFirst]).toEqual(xThenY)
    expect(xSecond).toBe(yFirst)
  })

  it('building a clone does not disturb the factory it was derived from', () => {
    const base = makeRowFactory().seed(7)
    const before = base.makeOne()
    base.with({ id: 99 }).count(5).makeMany()
    expect(base.makeOne()).toEqual(before)
  })

  it('seeded factories reproduce through create()', async () => {
    const f = makeRowFactory()
      .seed(11)
      .count(2)
      .persist((item) => item)
    expect(await f.createMany()).toEqual(await f.createMany())
  })

  it('leaves unseeded factories random', () => {
    // Guards against "fix" #1 being over-applied: reseeding an unseeded
    // factory would make every build identical.
    const f = makeRowFactory().count(12)
    const a = f.makeMany().map((r) => r.name)
    const b = f.makeMany().map((r) => r.name)
    expect(a).not.toEqual(b)
  })
})

describe('locale() isolation', () => {
  beforeAll(() => {
    registerLocale('zz-immut', { ...en, firstNames: ['ZED'] })
  })

  it('does not retro-actively change the factory it was derived from', () => {
    const base = makeRowFactory().seed(1)
    const zz = base.locale('zz-immut')
    expect(zz.makeOne().name).toBe('ZED')
    expect(base.makeOne().name).not.toBe('ZED')
  })

  it('sibling clones do not share one locale', () => {
    const base = makeRowFactory().seed(1)
    const enChild = base.locale('en')
    const zz = base.locale('zz-immut')
    expect(zz.makeOne().name).toBe('ZED')
    expect(enChild.makeOne().name).not.toBe('ZED')
  })

  it('a factory that already owns a faker is not mutated by its child', () => {
    const parent = makeRowFactory().locale('en')
    const child = parent.locale('zz-immut')
    expect(child.makeOne().name).toBe('ZED')
    expect(parent.makeOne().name).not.toBe('ZED')
  })

  it('seed() after locale() keeps the locale', () => {
    expect(makeRowFactory().locale('zz-immut').seed(5).makeOne().name).toBe('ZED')
  })

  it('locale() and seed() commute', () => {
    const localeFirst = makeRowFactory().locale('zz-immut').seed(5).count(3).makeMany()
    const seedFirst = makeRowFactory().seed(5).locale('zz-immut').count(3).makeMany()
    expect(localeFirst).toEqual(seedFirst)
  })
})

describe('sequence state does not leak', () => {
  interface Tagged {
    id: number
    role: string
  }
  const taggedFactory = () => defineFactory<Tagged>(({ seq }) => ({ id: seq, role: 'x' }))

  it('a derived factory does not consume the base cursor', () => {
    const base = taggedFactory().sequence([{ role: 'a' }, { role: 'b' }])
    const child = base.sequence([{ id: 1 }])
    expect(child.makeOne().role).toBe('a')
    expect(base.makeOne().role).toBe('a')
  })

  it('the state(Sequence) overload does not consume the base cursor', () => {
    const base = taggedFactory().state(sequence<Tagged>([{ role: 'a' }, { role: 'b' }]))
    const child = base.state(sequence<Tagged>([{ id: 1 }]))
    expect(child.makeOne().role).toBe('a')
    expect(base.makeOne().role).toBe('a')
  })

  it('a terminal build does not advance its own receiver', () => {
    const f = taggedFactory()
      .sequence([{ role: 'a' }, { role: 'b' }, { role: 'c' }, { role: 'd' }])
      .count(2)
    expect(f.makeMany().map((r) => r.role)).toEqual(['a', 'b'])
    expect(f.makeMany().map((r) => r.role)).toEqual(['a', 'b'])
  })

  it('makeOne() does not advance the cursor either', () => {
    const f = taggedFactory().sequence([{ role: 'a' }, { role: 'b' }])
    expect(f.makeOne().role).toBe('a')
    expect(f.makeOne().role).toBe('a')
  })

  it('still cycles within a single build', () => {
    const roles = taggedFactory()
      .sequence([{ role: 'a' }, { role: 'b' }])
      .count(5)
      .makeMany()
      .map((r) => r.role)
    expect(roles).toEqual(['a', 'b', 'a', 'b', 'a'])
  })
})

describe('fieldSequence() rejects an empty list', () => {
  it('throws at chain time instead of wiping the field to undefined', () => {
    expect(() => makeRowFactory().fieldSequence('name', [])).toThrow(
      '[Factory] fieldSequence("name"): expected at least one value.',
    )
  })
})

describe('lazy() values are resolved at build time', () => {
  interface Doc {
    id: number
    meta: unknown
  }
  const docFactory = () => defineFactory<Doc>(({ seq }) => ({ id: seq, meta: null }))

  it('resolves in state values', () => {
    const item = docFactory()
      .state('late', { meta: lazy(() => 'computed') })
      .state('late')
      .makeOne()
    expect(item.meta).toBe('computed')
  })

  it('resolves in sequence entries', () => {
    const item = docFactory()
      .sequence([{ meta: lazy(() => 'seq-computed') }])
      .makeOne()
    expect(item.meta).toBe('seq-computed')
  })

  it('resolves in with() overrides', () => {
    expect(
      docFactory()
        .with({ meta: lazy(() => 'override') })
        .makeOne().meta,
    ).toBe('override')
  })

  it('resolves in the definition itself', () => {
    const item = defineFactory<Doc>(({ seq }) => ({
      id: seq,
      meta: lazy(() => 'from-def'),
    })).makeOne()
    expect(item.meta).toBe('from-def')
  })

  it('evaluates once per built item, not once per chain', () => {
    let calls = 0
    const items = docFactory()
      .with({ meta: lazy(() => ++calls) })
      .count(3)
      .makeMany()
    expect(items.map((d) => d.meta)).toEqual([1, 2, 3])
  })

  it('leaves real user data that happens to own a resolve method alone', () => {
    // The marker is a symbol brand, not a `resolve` property, so a genuine
    // entity with its own resolve() must survive untouched.
    const impostor = { resolve: () => 'should not be called' }
    expect(docFactory().with({ meta: impostor }).makeOne().meta).toBe(impostor)
  })
})

describe('has() / hasAttached() widen the built type', () => {
  interface Post {
    id: number
    title: string
  }
  const postFactory = () =>
    defineFactory<Post>(({ seq }) => ({ id: seq, title: `t${String(seq)}` }))

  it('exposes has() children without a cast', () => {
    const user = makeRowFactory().has(postFactory().count(2), 'posts').makeOne()
    // No `as` here: this line is the regression test — it would not compile
    // when has() returned Factory<T>.
    const posts: Post[] = user.posts
    expect(posts).toHaveLength(2)
    expect(posts[0]?.title).toBe('t1')
  })

  it('exposes hasAttached() children with their pivot without a cast', () => {
    const user = makeRowFactory()
      .hasAttached(postFactory().count(2), 'tags', { active: true })
      .makeOne()
    const tags: (Post & { pivot: Record<string, unknown> })[] = user.tags
    expect(tags).toHaveLength(2)
    expect(tags[0]?.pivot).toEqual({ active: true })
  })
})

describe('seeded factories inside relations', () => {
  interface Post {
    title: string
  }
  const postFactory = () => defineFactory<Post>(({ faker }) => ({ title: faker.lorem.word() }))

  it('gives each parent different children from a seeded child factory', () => {
    const users = makeRowFactory()
      .seed(1)
      .has(postFactory().seed(7).count(2), 'posts')
      .count(3)
      .makeMany()
    const titles = users.map((u) => JSON.stringify(u.posts))
    expect(new Set(titles).size).toBe(3)
  })

  it('stays reproducible across terminal calls', () => {
    const f = makeRowFactory().seed(1).has(postFactory().seed(7).count(2), 'posts').count(3)
    expect(f.makeMany()).toEqual(f.makeMany())
  })

  it('does not let a child clone corrupt its parent clone', () => {
    const base = makeRowFactory().seed(42)
    const rows = base.has(base.count(1), 'kids').count(3).makeMany()
    expect(rows.map((r) => r.name)).toEqual(
      base
        .count(3)
        .makeMany()
        .map((r) => r.name),
    )
  })
})

describe('unseeded factories follow the default faker', () => {
  it('locale() keeps an unseeded factory reproducible under faker.seed()', () => {
    const f = makeRowFactory().locale('en').count(5)
    faker.seed(42)
    const first = f.makeMany()
    faker.seed(42)
    expect(f.makeMany()).toEqual(first)
  })
})

describe('refDate() pins dates for factories', () => {
  interface Dated {
    at: string
  }
  const datedFactory = () =>
    defineFactory<Dated>(({ faker }) => ({ at: faker.date.past().toISOString() }))
  const pin = Date.UTC(2024, 0, 1)

  it('pins via the factory chain', () => {
    const a = datedFactory().seed(1).refDate(pin).makeOne()
    const b = datedFactory().seed(1).refDate(new Date(pin)).makeOne()
    expect(a).toEqual(b)
    expect(Date.parse(a.at)).toBeLessThan(pin)
  })

  it('inherits the default faker pin', () => {
    faker.refDate(pin)
    try {
      expect(datedFactory().seed(1).makeOne()).toEqual(
        datedFactory().seed(1).refDate(pin).makeOne(),
      )
    } finally {
      faker.refDate(null)
    }
  })
})
