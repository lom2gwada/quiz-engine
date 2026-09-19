import { describe, expect, it } from 'vitest'
import { formatNumber, formatNumericValue } from './number'

const spaces = (s: string) => s.replace(/[\s  ]/g, ' ')

describe('formatNumber', () => {
  it('sépare les milliers', () => {
    expect(spaces(formatNumber(11190000))).toBe('11 190 000')
    expect(spaces(formatNumber(5130))).toBe('5 130')
  })
  it('laisse les nombres < 1000 intacts', () => {
    expect(formatNumber(430)).toBe('430')
    expect(formatNumber(0)).toBe('0')
  })
  it('utilise une espace insécable normale (U+00A0), pas la fine (U+202F) peu lisible', () => {
    expect(formatNumber(5130)).toContain(' ')
    expect(formatNumber(5130)).not.toContain(' ')
  })
  it('renvoie une chaîne pour les valeurs non finies', () => {
    expect(formatNumber(NaN)).toBe('NaN')
  })
})

describe('formatNumericValue', () => {
  it('sépare une population', () => {
    expect(spaces(formatNumericValue(11190000, false))).toBe('11 190 000')
  })
  it('laisse une année brute', () => {
    expect(formatNumericValue(1804, true)).toBe('1804')
  })
  it('arrondit une coordonnée (°) à 1 décimale — la précision brute du CSV serait une fausse précision', () => {
    expect(formatNumericValue(17.1274, false, undefined, '°')).toBe('17,1')
    expect(formatNumericValue(-61.8468, false, undefined, '°')).toBe('-61,8')
  })
  it("n'ajoute pas de décimale pour une coordonnée déjà ronde", () => {
    expect(formatNumericValue(-55, false, undefined, '°')).toBe('-55')
  })
  it("ne change rien pour une unité sans règle d'arrondi dédiée", () => {
    expect(formatNumericValue(17.1274, false, undefined, 'km²')).toBe('17,127')
    expect(formatNumericValue(17.1274, false)).toBe('17,127')
  })
})
