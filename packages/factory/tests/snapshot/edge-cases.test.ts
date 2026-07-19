import { describe, expect, it } from 'vitest'
import { snapshot } from '@'

describe('snapshot() cycles', () => {
  it('marks a self-reference instead of overflowing the stack', () => {
    const node: Record<string, unknown> = { id: 1 }
    node['self'] = node

    expect(snapshot(node)).toEqual({ id: 1, self: { __type: 'Circular' } })
  })

  it('marks a parent <-> child back-reference from a relation hook', () => {
    const parent: Record<string, unknown> = { id: 1, posts: [] as unknown[] }
    const post: Record<string, unknown> = { author: parent, id: 10 }
    ;(parent['posts'] as unknown[]).push(post)

    expect(snapshot(parent)).toEqual({
      id: 1,
      posts: [{ author: { __type: 'Circular' }, id: 10 }],
    })
  })

  it('marks an array that contains itself', () => {
    const arr: unknown[] = [1]
    arr.push(arr)

    expect(snapshot(arr)).toEqual([1, { __type: 'Circular' }])
  })

  it('still expands a shared reference used twice as a sibling (a DAG, not a cycle)', () => {
    const shared = { x: 1 }

    expect(snapshot({ a: shared, b: shared })).toEqual({ a: { x: 1 }, b: { x: 1 } })
  })

  it('marks a cycle reached through a Map value and a Set member', () => {
    const root: Record<string, unknown> = { id: 1 }
    root['meta'] = new Map([['self', root]])
    root['tags'] = new Set([root])

    expect(snapshot(root)).toEqual({
      id: 1,
      meta: { __type: 'Map', value: [['self', { __type: 'Circular' }]] },
      tags: { __type: 'Set', value: [{ __type: 'Circular' }] },
    })
  })
})

describe('snapshot() collections', () => {
  it('preserves Map contents and type', () => {
    expect(
      snapshot(
        new Map<string, number>([
          ['a', 1],
          ['b', 2],
        ]),
      ),
    ).toEqual({
      __type: 'Map',
      value: [
        ['a', 1],
        ['b', 2],
      ],
    })
  })

  it('preserves Set contents and type', () => {
    expect(snapshot(new Set([1, 2, 3]))).toEqual({ __type: 'Set', value: [1, 2, 3] })
  })

  it('distinguishes different Maps and different Sets', () => {
    const mapA = JSON.stringify(snapshot(new Map([['a', 1]])))
    const mapB = JSON.stringify(snapshot(new Map([['zzz', 999]])))
    expect(mapA).not.toBe(mapB)

    const setA = JSON.stringify(snapshot(new Set(['a', 'b'])))
    const setB = JSON.stringify(snapshot(new Set(['TOTALLY', 'DIFFERENT'])))
    expect(setA).not.toBe(setB)
  })

  it('distinguishes an empty Map, an empty Set and a plain object', () => {
    const empties = [snapshot(new Map()), snapshot(new Set()), snapshot({})].map((v) =>
      JSON.stringify(v),
    )
    expect(new Set(empties).size).toBe(3)
  })

  it('normalises nested values inside collections', () => {
    const d = new Date('2026-01-01T00:00:00.000Z')

    expect(snapshot({ meta: new Map([['at', d]]), tags: new Set([{ b: 2, a: 1 }]) })).toEqual({
      meta: {
        __type: 'Map',
        value: [['at', { __type: 'Date', value: '2026-01-01T00:00:00.000Z' }]],
      },
      tags: { __type: 'Set', value: [{ a: 1, b: 2 }] },
    })
  })

  it('is stable across repeated runs over equivalent collections', () => {
    const build = (): unknown =>
      snapshot({
        meta: new Map<string, unknown>([
          ['z', 1],
          ['a', new Set(['q', 'p'])],
        ]),
      })

    expect(JSON.stringify(build())).toBe(JSON.stringify(build()))
  })
})
