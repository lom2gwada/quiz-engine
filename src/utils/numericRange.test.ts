import { describe, expect, it } from 'vitest'
import { initialNumericValue } from './numericRange'

describe('initialNumericValue', () => {
  it('aligne le milieu sur le pas, comme le fait le navigateur (longitude du Venezuela : −145…−20, pas 5)', () => {
    expect(initialNumericValue(-145, -20, 5)).toBe(-80) // milieu −82,5 → pas de −82
    expect(Math.abs(initialNumericValue(-145, -20, 5) % 5)).toBe(0)
  })

  it('garde le milieu quand c’est déjà un multiple du pas', () => {
    expect(initialNumericValue(0, 100, 10)).toBe(50)
    expect(initialNumericValue(0, 1000, 50)).toBe(500)
  })

  it('compte les crans à partir de min, pas de zéro', () => {
    expect(initialNumericValue(3, 100, 10)).toBe(53) // milieu 51,5 → cran 5 (53) et non 50
  })

  it('gère un pas décimal sans bruit de virgule flottante', () => {
    expect(initialNumericValue(0, 1, 0.1)).toBe(0.5)
    expect(initialNumericValue(0.2, 0.9, 0.1)).toBe(0.6)
  })

  it('ne dépasse jamais le dernier cran atteignable avant max', () => {
    expect(initialNumericValue(0, 7, 5)).toBe(5)
    expect(initialNumericValue(0, 3, 5)).toBe(0)
  })

  it('repli sûr sur un intervalle ou un pas invalide', () => {
    expect(initialNumericValue(10, 10, 5)).toBe(10)
    expect(initialNumericValue(0, 10, 0)).toBe(0)
  })
})
