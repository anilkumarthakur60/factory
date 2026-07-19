import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpPersist, memoryPersist } from '@'

interface Row {
  id?: number | string
  tag?: string
}

const item = { name: 'x' }

/** Minimal `Response`-shaped stub — only the members `httpPersist` touches. */
const stubResponse = (over: {
  json?: () => Promise<unknown>
  ok?: boolean
  status?: number
  text?: () => Promise<string>
}) => ({
  ok: over.ok ?? true,
  status: over.status ?? 201,
  json: over.json ?? ((): Promise<unknown> => Promise.resolve({})),
  text: over.text ?? ((): Promise<string> => Promise.resolve('')),
})

describe('httpPersist — global fetch is resolved at call time', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses a fetch stubbed AFTER the adapter was constructed', async () => {
    // Stand in for the "real" fetch present at import time; the adapter must
    // never reach this once the stub replaces it.
    vi.stubGlobal('fetch', () => {
      throw new Error('REAL NETWORK CALL — mock was bypassed')
    })
    const persist = httpPersist<{ id: number }>('/api/users')

    const mock = vi.fn(() =>
      Promise.resolve(stubResponse({ json: () => Promise.resolve({ id: 99 }) })),
    )
    vi.stubGlobal('fetch', mock)

    await expect(persist({ id: 0 })).resolves.toEqual({ id: 99 })
    expect(mock).toHaveBeenCalledOnce()
  })

  it('picks up a fetch that did not exist when the adapter was built', async () => {
    vi.stubGlobal('fetch', undefined)
    const persist = httpPersist<{ id: number }>('/api/users')

    const mock = vi.fn(() =>
      Promise.resolve(stubResponse({ json: () => Promise.resolve({ id: 7 }) })),
    )
    vi.stubGlobal('fetch', mock)

    await expect(persist({ id: 0 })).resolves.toEqual({ id: 7 })
    expect(mock).toHaveBeenCalledOnce()
  })

  it('still reports a missing fetch when there genuinely is none', async () => {
    vi.stubGlobal('fetch', undefined)
    const persist = httpPersist<{ id: number }>('/api/users')
    await expect(persist({ id: 0 })).rejects.toThrow(/No global `fetch` is available/)
  })

  it('calls the global fetch bound to globalThis', async () => {
    // An unbound, detached `fetch` throws "Illegal invocation" in browsers;
    // assert the receiver survives the hand-off.
    const receivers: unknown[] = []
    vi.stubGlobal('fetch', function boundCheck(this: unknown) {
      receivers.push(this)
      return Promise.resolve(stubResponse({ json: () => Promise.resolve({ id: 1 }) }))
    })
    const persist = httpPersist<{ id: number }>('/api/users')
    await persist({ id: 0 })
    expect(receivers).toEqual([globalThis])
  })
})

describe('httpPersist — default parse', () => {
  const withJson = (json: unknown) =>
    httpPersist<Record<string, unknown>>('/api', {
      fetch: () => Promise.resolve(stubResponse({ json: () => Promise.resolve(json) })),
    })

  it('falls back to the whole payload when `data` is null', async () => {
    const envelope = { data: null, error: 'nope' }
    await expect(withJson(envelope)(item)).resolves.toEqual(envelope)
  })

  it('falls back to the whole payload when `data` is undefined', async () => {
    const envelope = { data: undefined, error: 'nope' }
    await expect(withJson(envelope)(item)).resolves.toEqual(envelope)
  })

  it('still unwraps a genuine { data } envelope', async () => {
    await expect(withJson({ data: { id: 42 } })(item)).resolves.toEqual({ id: 42 })
  })

  it('still passes a flat response through untouched', async () => {
    await expect(withJson({ id: 99, name: 'Flat' })(item)).resolves.toEqual({
      id: 99,
      name: 'Flat',
    })
  })
})

describe('httpPersist — error reporting', () => {
  it('detects non-2xx and names the url, status and body', async () => {
    const persist = httpPersist<Record<string, unknown>>('/api/users', {
      fetch: () =>
        Promise.resolve(
          stubResponse({ ok: false, status: 422, text: () => Promise.resolve('{"error":"bad"}') }),
        ),
    })
    await expect(persist(item)).rejects.toThrow(
      '[httpPersist] POST /api/users → 422: {"error":"bad"}',
    )
  })

  it('does not treat a 2xx-with-ok:false response as success', async () => {
    // `ok` is the only signal checked; a 200 with ok:false must still throw.
    const persist = httpPersist<Record<string, unknown>>('/api/users', {
      fetch: () => Promise.resolve(stubResponse({ ok: false, status: 200 })),
    })
    await expect(persist(item)).rejects.toThrow(/\[httpPersist\] POST \/api\/users → 200/)
  })

  it('wraps an invalid JSON body with context instead of leaking a bare SyntaxError', async () => {
    const persist = httpPersist<Record<string, unknown>>('/api', {
      fetch: () =>
        Promise.resolve(
          stubResponse({
            status: 200,
            json: () => Promise.reject(new SyntaxError('Unexpected token <')),
            text: () => Promise.resolve('<html>'),
          }),
        ),
    })
    await expect(persist(item)).rejects.toThrow(
      '[httpPersist] POST /api → 200: invalid JSON response (<html>)',
    )
  })
})

describe('memoryPersist — id uniqueness', () => {
  it('never reuses an id the definition already supplied', async () => {
    const store = memoryPersist<Row>()
    await store({ id: 1, tag: 'explicit-one' })
    const autoA = await store({ tag: 'auto-a' })
    const autoB = await store({ tag: 'auto-b' })

    expect(store.all().map((r) => r.id)).toEqual([1, 2, 3])
    expect(autoA.id).toBe(2)
    expect(autoB.id).toBe(3)
    // Every persisted row must be reachable — `find` returns the first match,
    // so a duplicate id would shadow the later row entirely.
    expect(store.find(autoA.id)).toBe(autoA)
    expect(store.find(autoB.id)).toBe(autoB)
    expect(store.find(1)?.tag).toBe('explicit-one')
  })

  it('jumps the counter past a high explicit id', async () => {
    const store = memoryPersist<Row>()
    await store({ tag: 'auto-first' })
    await store({ id: 900, tag: 'legacy' })
    expect((await store({ tag: 'auto-after' })).id).toBe(901)
  })

  it('ignores non-numeric ids when advancing the counter', async () => {
    const store = memoryPersist<Row>()
    await store({ id: 'uuid-abc', tag: 'string-id' })
    expect((await store({ tag: 'auto' })).id).toBe(1)
  })

  it('restarts the counter after reset()', async () => {
    const store = memoryPersist<Row>()
    await store({ id: 50, tag: 'explicit' })
    store.reset()
    expect((await store({ tag: 'auto' })).id).toBe(1)
  })

  it('hands out a copy from all(), so external mutation cannot corrupt the store', async () => {
    const store = memoryPersist<Row>()
    await store({ tag: 'kept' })
    const snapshot = store.all()
    snapshot.push({ id: 999, tag: 'intruder' })
    snapshot.length = 0
    expect(store.all()).toHaveLength(1)
  })
})
