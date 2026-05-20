import { describe, expect, it } from 'vitest'
import { snapshot } from '@'

describe('snapshot()', () => {
  it('normalises Dates to a stable shape', () => {
    const d = new Date('2026-01-01T00:00:00.000Z')
    expect(snapshot(d)).toEqual({ __type: 'Date', value: '2026-01-01T00:00:00.000Z' })
  })

  it('sorts object keys deterministically', () => {
    const out = snapshot({ b: 2, a: 1, c: 3 }) as Record<string, number>
    expect(Object.keys(out)).toEqual(['a', 'b', 'c'])
  })

  it('recurses into arrays + nested objects', () => {
    const value = {
      items: [
        { b: 2, a: 1 },
        { b: 4, a: 3 },
      ],
    }
    const out = snapshot(value) as { items: Record<string, number>[] }
    expect(out.items[0]).toEqual({ a: 1, b: 2 })
    expect(out.items[1]).toEqual({ a: 3, b: 4 })
  })

  it('preserves primitives + null + undefined', () => {
    expect(snapshot(null)).toBeNull()
    expect(snapshot(undefined)).toBeUndefined()
    expect(snapshot('hi')).toBe('hi')
    expect(snapshot(42)).toBe(42)
    expect(snapshot(true)).toBe(true)
  })
})
