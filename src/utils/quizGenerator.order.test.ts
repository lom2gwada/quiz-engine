import { describe, expect, it } from 'vitest'
import { ORDER_GAP, generateQuiz, inferSchema, minNeighbourGap, orderingDifficulty, parseCsv } from './quizGenerator'

// 40 éléments : une température étalée (-250 à 3 500 °C) avec des paires très proches (798 / 819), une année de découverte.
const rows = parseCsv([
  'element;temp;annee',
  ...Array.from({ length: 40 }, (_, i) => `E${i};${i === 5 ? 798 : i === 6 ? 819 : -250 + i * 95};${1700 + i * 3}`),
].join('\n'))
const schema = { ...inferSchema(rows), noun: 'élément', title: 'Test' }

const valuesOf = (labels: string[], column: 'temp' | 'annee') => labels.map((label) => Number(rows.find((r) => r.element === label)![column]))

describe('ordering questions: difficulty follows the gap between neighbouring values', () => {
  it('orderingDifficulty / minNeighbourGap', () => {
    expect(minNeighbourGap([798, 819, 1500, 3000], false)).toBeCloseTo(21 / 819, 5)
    expect(orderingDifficulty(21 / 819, false)).toBeNull() // 2,6 % : écarté (798 °C et 819 °C)
    expect(orderingDifficulty(0.05, false)).toBe('hard')
    expect(orderingDifficulty(0.19, false)).toBe('hard')
    expect(orderingDifficulty(0.2, false)).toBe('medium')
    expect(orderingDifficulty(0.4, false)).toBe('easy')
    expect(minNeighbourGap([1766, 1769, 1800], true)).toBe(3)
    expect(orderingDifficulty(1, true)).toBeNull()
    expect(orderingDifficulty(10, true)).toBe('medium')
  })

  it('no ordering question has neighbours closer than the minimum, and the level matches the gap', () => {
    let checked = 0
    const seen = new Set<string>()
    for (const seed of ['a', 'b', 'c', 'd']) {
      const quiz = generateQuiz(rows, schema, { seed })
      for (const q of quiz.questions) {
        if (q.type !== 'ordering') continue
        const column = q.tags[0] as 'temp' | 'annee'
        const isYear = column === 'annee'
        const gap = minNeighbourGap(valuesOf(q.content.items.map((item) => item.label), column), isYear)
        const limits = isYear ? ORDER_GAP.years : ORDER_GAP.relative
        expect(gap, q.question).toBeGreaterThanOrEqual(limits.hard)
        const expected = gap >= limits.easy ? 'easy' : gap >= limits.medium ? 'medium' : 'hard'
        expect(q.difficulty).toBe(expected)
        seen.add(q.difficulty)
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(20)
    expect(seen.size).toBeGreaterThan(1) // plus seulement « difficile »
  })
})
