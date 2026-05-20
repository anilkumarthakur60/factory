import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineFactory, httpPersist, memoryPersist } from '@'
import type { User } from './helpers'

const makeFactory = () =>
  defineFactory<User>(({ seq, faker }) => ({
    id: seq,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'viewer',
    active: true,
  }))

describe('memoryPersist', () => {
  it('assigns ids, returns the item, and exposes a queryable store', async () => {
    const store = memoryPersist<User>()
    const items = await makeFactory().persist(store).count(3).createMany()
    expect(items).toHaveLength(3)
    expect(store.all()).toHaveLength(3)
    expect(store.find(1)?.id).toBe(1)
    store.reset()
    expect(store.all()).toHaveLength(0)
  })
})

describe('httpPersist', () => {
  afterEach(() => vi.restoreAllMocks())

  it('POSTs and unwraps a wrapped { data } response', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            data: {
              id: 42,
              name: 'Server Name',
              email: 'srv@x.test',
              role: 'viewer',
              active: true,
            },
          }),
        text: () => Promise.resolve(''),
      }),
    )
    const persist = httpPersist<User>('/users', { fetch: fetchMock })
    const user = await persist({ id: 0, name: 'x', email: 'x@y.z', role: 'viewer', active: true })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(user.id).toBe(42)
    expect(user.name).toBe('Server Name')
  })

  it('accepts a flat (non-wrapped) response shape', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 99,
            name: 'Flat',
            email: 'flat@x.test',
            role: 'admin',
            active: false,
          }),
        text: () => Promise.resolve(''),
      }),
    )
    const persist = httpPersist<User>('/users', { fetch: fetchMock })
    const user = await persist({ id: 0, name: 'x', email: 'x@y.z', role: 'viewer', active: true })
    expect(user.id).toBe(99)
    expect(user.role).toBe('admin')
  })

  it('throws on non-2xx', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 422,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{"error":"validation"}'),
      }),
    )
    const persist = httpPersist<User>('/users', { fetch: fetchMock })
    await expect(
      persist({ id: 0, name: 'x', email: 'x@y.z', role: 'viewer', active: true }),
    ).rejects.toThrow(/422/)
  })
})
