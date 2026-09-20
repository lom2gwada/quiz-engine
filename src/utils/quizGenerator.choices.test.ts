import { describe, expect, it } from 'vitest'
import { generateQuiz, inferSchema, parseCsv } from './quizGenerator'
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
