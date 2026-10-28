import { describe, expect, it } from 'vitest'
import { getT, plural } from './index'
import { SUPPORTED_LOCALES, type Locale } from './locale'

describe('plural', () => {
  it('sans langue : seul 1 est au singulier', () => {
    expect(plural('quiz.points', 1)).toBe('quiz.points.one')
    expect(plural('quiz.points', 0)).toBe('quiz.points.other')
    expect(plural('quiz.points', 2)).toBe('quiz.points.other')
  })

  it('avec la langue : en français 0 et 1 sont au singulier, pas en anglais', () => {
    expect(plural('quiz.points', 0, 'fr')).toBe('quiz.points.one')
    expect(plural('quiz.points', 1, 'fr')).toBe('quiz.points.one')
    expect(plural('quiz.points', 2, 'fr')).toBe('quiz.points.other')
    expect(plural('quiz.points', 0, 'en')).toBe('quiz.points.other')
    expect(plural('quiz.points', 1, 'en')).toBe('quiz.points.one')
  })
})

describe('« pts » : singulier et pluriel dans les 5 langues', () => {
  const expected: Record<Locale, { one: string; other: string }> = {
    fr: { one: '1 pt', other: '3 pts' },
    en: { one: '1 pt', other: '3 pts' },
    es: { one: '1 pt', other: '3 pts' },
    nl: { one: '1 pt', other: '3 ptn' },
    ht: { one: '1 pwen', other: '3 pwen' },
  }
  for (const locale of SUPPORTED_LOCALES) {
    it(locale, () => {
      const t = getT(locale)
      expect(t(plural('quiz.points', 1, locale), { n: 1 })).toBe(expected[locale].one)
      expect(t(plural('quiz.points', 3, locale), { n: 3 })).toBe(expected[locale].other)
      expect(t(plural('history.pointsPair', 1, locale), { earned: 1, total: 1 })).toBe(`1 / ${expected[locale].one}`)
      expect(t(plural('history.pointsPair', 12, locale), { earned: 8, total: 12 })).toBe(`8 / ${expected[locale].other.replace('3', '12')}`)
    })
  }
})

describe('« x / n réussies (p %) » dans les 5 langues', () => {
  const expected: Record<Locale, { one: string; other: string }> = {
    fr: { one: '1 / 1 réussie (100 %)', other: '3 / 5 réussies (60 %)' },
    en: { one: '1 / 1 correct (100%)', other: '3 / 5 correct (60%)' },
    es: { one: '1 / 1 acertada (100 %)', other: '3 / 5 acertadas (60 %)' },
    nl: { one: '1 / 1 goed (100 %)', other: '3 / 5 goed (60 %)' },
    ht: { one: '1 / 1 reyisi (100 %)', other: '3 / 5 reyisi (60 %)' },
  }
  for (const locale of SUPPORTED_LOCALES) {
    it(locale, () => {
      const t = getT(locale)
      expect(t(plural('result.successRate', 1, locale), { correct: 1, total: 1, percent: 100 })).toBe(expected[locale].one)
      expect(t(plural('result.successRate', 5, locale), { correct: 3, total: 5, percent: 60 })).toBe(expected[locale].other)
    })
  }
})
