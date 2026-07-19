import { describe, expect, it } from 'vitest'
import { array, faker, maybe, oneOf } from '@'

describe('builders', () => {
  it('oneOf picks an element from the array', () => {
    const choice = oneOf(['a', 'b', 'c'])
    expect(['a', 'b', 'c']).toContain(choice)
  })

  it('maybe respects the probability — chance=1 always returns the value', () => {
    expect(maybe('present', 1)).toBe('present')
    expect(maybe('present', 0)).toBeUndefined()
  })

  it('array(min, fn) builds exactly min items', () => {
    const out = array(3, (i) => i * 2)
    expect(out).toEqual([0, 2, 4])
  })

  it('array(min, max, fn) builds between min and max items', () => {
    faker.seed(11)
    const out = array(2, 5, (i) => i)
    expect(out.length).toBeGreaterThanOrEqual(2)
    expect(out.length).toBeLessThanOrEqual(5)
  })
})
