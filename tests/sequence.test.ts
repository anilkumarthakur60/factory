import { describe, expect, it } from 'vitest'
import { Sequence, sequence } from '../src'

describe('Sequence', () => {
  it('cycles values', () => {
    const s = sequence<{ role: string }>([{ role: 'admin' }, { role: 'editor' }])
    expect(s.next()).toEqual({ role: 'admin' })
    expect(s.next()).toEqual({ role: 'editor' })
    expect(s.next()).toEqual({ role: 'admin' })
  })

  it('supports closure entries with index info', () => {
    const s = new Sequence<{ name: string }>([({ index }) => ({ name: `User ${index}` })])
    expect(s.next()).toEqual({ name: 'User 0' })
    expect(s.next()).toEqual({ name: 'User 1' })
  })

  it('supports mixed value + closure entries', () => {
    const s = new Sequence<{ kind: string }>([
      { kind: 'lit' },
      ({ count }) => ({ kind: `dyn-${count}` }),
    ])
    expect(s.next()).toEqual({ kind: 'lit' })
    expect(s.next()).toEqual({ kind: 'dyn-2' })
  })

  it('reset() returns cursor to 0', () => {
    const s = sequence<{ n: number }>([{ n: 1 }, { n: 2 }])
    s.next()
    s.next()
    expect(s.currentIndex).toBe(2)
    s.reset()
    expect(s.currentIndex).toBe(0)
    expect(s.next()).toEqual({ n: 1 })
  })

  it('throws if constructed with no entries', () => {
    expect(() => new Sequence([])).toThrow(/at least one entry/i)
  })

  it('clone() yields a fresh cursor', () => {
    const a = sequence<{ x: number }>([{ x: 1 }, { x: 2 }])
    a.next()
    const b = a.clone()
    expect(b.currentIndex).toBe(0)
    expect(b.next()).toEqual({ x: 1 })
  })
})
