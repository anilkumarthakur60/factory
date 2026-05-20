import { describe, expect, it } from 'vitest'
import { Collection, FactoryRegistry, defineFactory, memoryPersist, oneOf, sequence } from '../src'
import type { Post, User } from './helpers'

const makeUserFactory = () =>
  defineFactory<User>(({ seq, faker }) => ({
    id: seq,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: oneOf(['admin', 'editor', 'viewer']),
    active: true,
  }))
    .state('admin', { role: 'admin' })
    .state('inactive', { active: false })
    .state('with-suspension', (item, { faker }) => ({
      active: false,
      // a state can derive values; here we use the suspended user's own name.
      name: `${item.name} (suspended)`,
      email: faker.internet.email({ firstName: 'suspended' }),
    }))

const makePostFactory = () =>
  defineFactory<Post>(({ seq, faker }) => ({
    id: seq,
    title: faker.lorem.sentence(4),
    userId: 0,
  }))

describe('Factory · build', () => {
  it('make() returns a single item when count is 1', () => {
    const u = makeUserFactory().make()
    expect(Array.isArray(u)).toBe(false)
    expect((u as User).id).toBe(1)
  })

  it('count(5).make() returns an array of 5', () => {
    const users = makeUserFactory().count(5).make()
    expect(Array.isArray(users)).toBe(true)
    expect((users as User[]).map((u) => u.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('with() overrides specific fields', () => {
    const u = makeUserFactory().with({ email: 'pin@me.com' }).makeOne()
    expect(u.email).toBe('pin@me.com')
  })

  it('state(name) activates a registered state', () => {
    const u = makeUserFactory().state('admin').makeOne()
    expect(u.role).toBe('admin')
  })

  it('state(name) with a function-state has access to item + ctx', () => {
    const u = makeUserFactory().state('with-suspension').makeOne()
    expect(u.active).toBe(false)
    expect(u.name).toMatch(/\(suspended\)$/)
    expect(u.email).toMatch(/^suspended/)
  })

  it('unknown state throws a helpful error', () => {
    expect(() => makeUserFactory().state('nope').makeOne()).toThrow(/Unknown state/)
  })

  it('states() bulk-registers states', () => {
    const f = makeUserFactory().states({
      vip: { role: 'admin' },
      guest: { role: 'viewer' },
    })
    expect(f.state('vip').makeOne().role).toBe('admin')
    expect(f.state('guest').makeOne().role).toBe('viewer')
  })

  it('sequence() cycles attribute patches', () => {
    const users = makeUserFactory()
      .sequence([{ role: 'admin' }, { role: 'editor' }, { role: 'viewer' }])
      .count(6)
      .makeMany()
    expect(users.map((u) => u.role)).toEqual([
      'admin',
      'editor',
      'viewer',
      'admin',
      'editor',
      'viewer',
    ])
  })

  it('fieldSequence() cycles one field', () => {
    const users = makeUserFactory().fieldSequence('role', ['admin', 'editor']).count(4).makeMany()
    expect(users.map((u) => u.role)).toEqual(['admin', 'editor', 'admin', 'editor'])
  })

  it('has() attaches child collection', () => {
    const u = makeUserFactory().has(makePostFactory().count(2), 'posts').makeOne() as User & {
      posts: Post[]
    }
    expect(u.posts).toHaveLength(2)
    expect(u.posts[0]!.title.length).toBeGreaterThan(0)
  })

  it('for() injects a parent foreign key', () => {
    const p = makePostFactory().for(makeUserFactory(), 'userId').makeOne()
    expect(p.userId).toBeGreaterThan(0)
  })

  it('for() with a custom resolver', () => {
    const p = makePostFactory()
      .for(makeUserFactory(), 'userId', (user) => ({ userId: user.id }))
      .makeOne()
    expect(p.userId).toBeGreaterThan(0)
  })

  it('hasAttached() attaches pivot data', () => {
    const RoleFactory = defineFactory<{ id: number; name: string }>(({ seq }) => ({
      id: seq,
      name: `R${seq}`,
    }))
    const u = makeUserFactory()
      .hasAttached(RoleFactory.count(2), 'roles', { active: true })
      .makeOne() as User & { roles: { id: number; pivot: Record<string, unknown> }[] }
    expect(u.roles).toHaveLength(2)
    expect(u.roles[0]!.pivot).toEqual({ active: true })
  })

  it('recycle() reuses model instances', () => {
    const team = { id: 99, name: 'Acme' }
    const f = makeUserFactory().recycle(team, 'Team')
    expect(f.getRecycled('Team')).toEqual(team)
  })

  it('seed() makes the factory deterministic', () => {
    const a = makeUserFactory().seed(1).makeOne()
    const b = makeUserFactory().seed(1).makeOne()
    expect(a.email).toBe(b.email)
    expect(a.name).toBe(b.name)
  })

  it('collect() returns a Collection', () => {
    const c = makeUserFactory().count(3).collect()
    expect(c).toBeInstanceOf(Collection)
    expect(c.count()).toBe(3)
    expect(c.pluck('id').toArray()).toEqual([1, 2, 3])
  })
})

describe('Factory · create', () => {
  it('persists via the supplied callback', async () => {
    const store = memoryPersist<User>()
    const f = makeUserFactory().persist(store)
    const users = await f.count(3).createMany()
    expect(users).toHaveLength(3)
    expect(store.all()).toHaveLength(3)
    expect(store.find(1)).toBeDefined()
  })

  it('runs afterMaking + afterCreating hooks in order', async () => {
    const order: string[] = []
    const store = memoryPersist<User>()
    const f = makeUserFactory()
      .afterMaking(() => {
        order.push('making')
      })
      .afterCreating(() => {
        order.push('creating')
      })
      .persist(store)
    await f.count(2).createMany()
    expect(order).toEqual(['making', 'making', 'creating', 'creating'])
  })

  it('throws when create() is called without a persist callback', async () => {
    await expect(makeUserFactory().create()).rejects.toThrow(/persist/)
  })
})

describe('Factory · immutability + chain', () => {
  it('each chain method returns a new factory', () => {
    const a = makeUserFactory()
    const b = a.count(5)
    const c = b.with({ name: 'pinned' })
    expect(a).not.toBe(b)
    expect(b).not.toBe(c)
    expect((a.make() as User).name).not.toBe('pinned')
    expect(c.makeOne().name).toBe('pinned')
  })

  it('count() rejects negative numbers', () => {
    expect(() => makeUserFactory().count(-1)).toThrow()
  })
})

describe('Factory · registry', () => {
  it('round-trips by name', () => {
    FactoryRegistry.clear()
    const f = makeUserFactory()
    FactoryRegistry.register('User', f)
    expect(FactoryRegistry.has('User')).toBe(true)
    expect(FactoryRegistry.names()).toContain('User')
    const u = FactoryRegistry.resolve<User>('User').makeOne()
    expect(u.id).toBeGreaterThan(0)
    FactoryRegistry.unregister('User')
    expect(FactoryRegistry.has('User')).toBe(false)
  })

  it('throws when resolving an unregistered name', () => {
    FactoryRegistry.clear()
    expect(() => FactoryRegistry.resolve('Nope')).toThrow(/No factory/)
  })
})

describe('Factory · sequence integration', () => {
  it('accepts a pre-built Sequence via state()', () => {
    const f = makeUserFactory().state(sequence<User>([{ active: true }, { active: false }]))
    const users = f.count(4).makeMany()
    expect(users.map((u) => u.active)).toEqual([true, false, true, false])
  })
})
