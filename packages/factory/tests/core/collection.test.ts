import { describe, expect, it } from 'vitest'
import { Collection } from '@'

interface Item {
  active: boolean
  id: number
  name: string
}

const sample: Item[] = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false },
  { id: 3, name: 'Carol', active: true },
]

describe('Collection', () => {
  it('reports count and emptiness', () => {
    expect(new Collection(sample).count()).toBe(3)
    expect(new Collection([]).isEmpty()).toBe(true)
  })

  it('each() runs side effects + chains', () => {
    const seen: number[] = []
    new Collection(sample).each((it) => seen.push(it.id))
    expect(seen).toEqual([1, 2, 3])
  })

  it('map() projects to a new Collection', () => {
    const ids = new Collection(sample).map((it) => it.id).toArray()
    expect(ids).toEqual([1, 2, 3])
  })

  it('pluck() extracts a single field', () => {
    const names = new Collection(sample).pluck('name').toArray()
    expect(names).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('where() filters', () => {
    const active = new Collection(sample).where((it) => it.active).toArray()
    expect(active).toEqual([sample[0], sample[2]])
  })

  it('first() supports predicate', () => {
    const c = new Collection(sample)
    expect(c.first()).toEqual(sample[0])
    expect(c.first((it) => it.id === 2)).toEqual(sample[1])
    expect(c.first((it) => it.id === 999)).toBeUndefined()
  })

  it('last() returns the last item', () => {
    expect(new Collection(sample).last()).toEqual(sample[2])
  })

  it('sortBy() sorts asc/desc', () => {
    const desc = new Collection(sample).sortBy('id', 'desc').toArray()
    expect(desc.map((i) => i.id)).toEqual([3, 2, 1])
  })

  it('groupBy() buckets items', () => {
    const groups = new Collection(sample).groupBy((it) => it.active)
    expect(groups.get(true)).toHaveLength(2)
    expect(groups.get(false)).toHaveLength(1)
  })

  it('reduce() folds', () => {
    const total = new Collection(sample).reduce((acc, it) => acc + it.id, 0)
    expect(total).toBe(6)
  })

  it('iterates with for..of', () => {
    const ids: number[] = []
    for (const it of new Collection(sample)) ids.push(it.id)
    expect(ids).toEqual([1, 2, 3])
  })

  it('items array is frozen', () => {
    const c = new Collection(sample)
    expect(() => (c.items as Item[]).push(sample[0]!)).toThrow()
  })
})
