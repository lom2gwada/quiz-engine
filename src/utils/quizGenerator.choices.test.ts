import { describe, expect, it } from 'vitest'
import { decimalsOf, generateQuiz, inferSchema, matchPrecision, parseCsv } from './quizGenerator'
import { blitzPool } from './blitz'

const rows = parseCsv([
  'pays;article;capitale;monnaie',
  'Cuba;;La Havane;peso',
  'Haïti;;Port-au-Prince;gourde',
  'Jamaïque;la;Kingston;dollar jamaïcain',
  'Barbade;la;Bridgetown;dollar barbadien',
  'Bahamas;les;Nassau;dollar bahaméen',
  'Belize;;Belmopan;dollar bélizien',
].join('\n'))
const schema = { ...inferSchema(rows), noun: 'territoire', title: 'Test' }

const singleChoiceSizes = (choices?: number): Set<number> => {
  const quiz = generateQuiz(rows, schema, { seed: 'blitz', choices })
  return new Set(quiz.questions.flatMap((q) => (q.type === 'qcm' && !q.content.multiple ? [q.content.answers.length] : [])))
}

describe('generateQuiz choices option', () => {
  it('keeps 3 choices for single-answer QCMs by default', () => {
    expect(singleChoiceSizes()).toEqual(new Set([3]))
  })

  it('generates 4 choices when asked, all eligible for the blitz', () => {
    expect(singleChoiceSizes(4)).toEqual(new Set([4]))
    const quiz = generateQuiz(rows, schema, { seed: 'blitz', choices: 4 })
    expect(blitzPool(quiz.questions).length).toBeGreaterThan(0)
    for (const q of blitzPool(quiz.questions)) {
      if (q.type !== 'qcm') continue
      expect(new Set(q.content.answers.map((a) => a.label)).size).toBe(4)
    }
  })

  it('does not change which questions exist, only their number of choices', () => {
    const ids = (choices?: number) => generateQuiz(rows, schema, { seed: 'blitz', choices }).questions.filter((q) => q.type === 'qcm' && !q.content.multiple).map((q) => q.id).sort()
    expect(ids(4)).toEqual(ids())
  })
})

// Finesse d'une option affichée (« 1 234 », « 17,1 », « 1 600 hab. ») : décimales et zéros terminaux de sa partie entière / décimale.
const finesse = (label: string): string => {
  const number = label.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0] ?? ''
  const decimals = (number.split('.')[1] ?? '').length
  const digits = number.replace('-', '').replace('.', '')
  const trailingZeros = (digits.match(/0*$/)?.[0] ?? '').length
  return `${decimals} décimales, ${decimals ? 0 : trailingZeros} zéros`
}

describe('numeric decoys have the same precision as the correct answer', () => {
  const numRows = parseCsv([
    'pays;altitude_m;population;latitude;fete',
    'A;1234;94000;17.1274;1er mai',
    'B;1600;250000;3.5;2 mai',
    'C;487;1320000;-12.4821;3 mai',
    'D;5000;730;45.25;4 mai',
    'E;88;41;8.8;5 mai',
    'F;2750;905000;21.0035;6 mai',
  ].join('\n'))
  const numSchema = { ...inferSchema(numRows), noun: 'territoire', title: 'Test' }

  it('no option of a numeric QCM stands out by its precision', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const quiz = generateQuiz(numRows, numSchema, { seed })
      const numeric = quiz.questions.filter((q) => q.type === 'qcm' && !q.content.multiple && ['altitude_m', 'population', 'latitude'].includes(q.tags[0]))
      expect(numeric.length).toBeGreaterThan(0)
      for (const q of numeric) {
        if (q.type !== 'qcm') continue
        const labels = q.content.answers.map((a) => a.label)
        expect(new Set(labels).size).toBe(labels.length) // leurres distincts entre eux et de la bonne réponse
        expect(new Set(labels.map(finesse)).size, labels.join(' / ')).toBe(1)
      }
    }
  })

  it('matchPrecision keeps the last significant digit of the target in place and non-zero', () => {
    expect(matchPrecision(493.6, 1234, 0, 1)).toBe(494)
    expect(matchPrecision(700, 1234, 0, 1)).toBe(701) // 700 aurait l'air arrondi à côté de 1 234
    expect(matchPrecision(700, 1234, 0, -1)).toBe(699)
    expect(matchPrecision(940, 1600, 0, 1)).toBe(900) // finesse de 1 600 : la centaine
    expect(matchPrecision(1000, 1600, 0, 1)).toBe(1100)
    expect(matchPrecision(8.7, 3.5, 1, 1)).toBe(8.7)
    expect(matchPrecision(7, 3.5, 1, 1)).toBe(7.1)
  })

  it('decimalsOf counts displayed decimals, capped', () => {
    expect(decimalsOf(1234, 3)).toBe(0)
    expect(decimalsOf(3.5, 3)).toBe(1)
    expect(decimalsOf(17.1274, 3)).toBe(3)
    expect(decimalsOf(17.1274, 1)).toBe(1)
    expect(decimalsOf(0.1 + 0.2, 3)).toBe(1)
  })
})
