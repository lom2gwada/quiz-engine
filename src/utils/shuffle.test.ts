import { describe, expect, it } from 'vitest'
import { shuffle } from './shuffle'

describe('shuffle', () => {
  it('keeps the same elements', () => {
    const items = [1, 2, 3, 4, 5]
    expect(shuffle(items).sort()).toEqual(items.sort())
  })

  it('does not mutate the original array', () => {
    const items = [1, 2, 3, 4, 5]
    const copy = [...items]
    shuffle(items)
    expect(items).toEqual(copy)
  })

  it('returns an empty array unchanged', () => {
    expect(shuffle([])).toEqual([])
  })

  it('returns a single-item array unchanged', () => {
    expect(shuffle(['a'])).toEqual(['a'])
  })

  it('preserves array length', () => {
    const items = Array.from({ length: 20 }, (_, index) => index)
    expect(shuffle(items)).toHaveLength(20)
  })
})
