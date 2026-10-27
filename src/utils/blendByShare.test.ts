import { describe, expect, it } from 'vitest'
import { blendByShare } from './blendByShare'

const rest = Array.from({ length: 200 }, (_, i) => `r${i}`)
const boosted = Array.from({ length: 40 }, (_, i) => `b${i}`)
const countBoosted = (list: string[]) => list.filter((item) => item.startsWith('b')).length

describe('blendByShare', () => {
  it('donne environ la part demandée à la série boostée, sur toute fenêtre', () => {
    for (const phase of [0, 0.3, 0.9]) {
      const out = blendByShare(rest, boosted, 0.1, phase)
      expect(countBoosted(out.slice(0, 20))).toBeGreaterThanOrEqual(1)
      expect(countBoosted(out.slice(0, 20))).toBeLessThanOrEqual(3)
      expect(countBoosted(out.slice(0, 100))).toBeGreaterThanOrEqual(9)
      expect(countBoosted(out.slice(0, 100))).toBeLessThanOrEqual(11)
    }
  })

  it('garde l’ordre de chaque série et toutes les questions', () => {
    const out = blendByShare(rest, boosted, 0.1, 0.5)
    expect(out).toHaveLength(240)
    expect(out.filter((item) => item.startsWith('r'))).toEqual(rest)
    expect(out.filter((item) => item.startsWith('b'))).toEqual(boosted)
  })

  it('continue avec l’autre série quand une est épuisée', () => {
    expect(blendByShare(['r0', 'r1'], ['b0'], 0.5, 0)).toEqual(['r0', 'b0', 'r1'])
    expect(blendByShare([], ['b0', 'b1'], 0.1, 0)).toEqual(['b0', 'b1'])
    expect(blendByShare(['r0'], [], 0.5, 0)).toEqual(['r0'])
  })

  it('une part de 0 ne mêle rien en tête', () => {
    expect(blendByShare(['r0', 'r1'], ['b0'], 0, 0)).toEqual(['r0', 'r1', 'b0'])
  })
})
