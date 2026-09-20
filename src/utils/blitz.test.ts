import { describe, expect, it } from 'vitest'
import type { Question } from '../types/quiz'
import { BLITZ_MAX_ERRORS, BLITZ_QUESTION_COUNT, BLITZ_SECONDS, blitzPool, isBlitzEligible } from './blitz'

const base = { category: 'c', difficulty: 'easy' as const, tags: [], explanation: '', points: 1 }
const options = (count: number, correct: number) =>
  Array.from({ length: count }, (_, i) => ({ id: String(i), label: `Option ${i}`, isCorrect: i < correct }))

const qcm = (id: string, count: number, correct: number, multiple = false): Question => ({
  ...base, id, type: 'qcm', question: 'Q ?', content: { multiple, answers: options(count, correct) },
})

describe('isBlitzEligible', () => {
  it('accepts a single-answer question with exactly 4 choices', () => {
    expect(isBlitzEligible(qcm('a', 4, 1))).toBe(true)
  })

  it('rejects multi-answer questions, other choice counts and several correct answers', () => {
    expect(isBlitzEligible(qcm('multi', 4, 1, true))).toBe(false)
    expect(isBlitzEligible(qcm('five', 5, 1))).toBe(false)
    expect(isBlitzEligible(qcm('three', 3, 1))).toBe(false)
    expect(isBlitzEligible(qcm('two-right', 4, 2))).toBe(false)
    expect(isBlitzEligible(qcm('none-right', 4, 0))).toBe(false)
  })

  it('rejects questions that are not multiple choice', () => {
    const boolean: Question = { ...base, id: 'b', type: 'boolean', question: 'Vrai ?', content: { isTrue: true } }
    expect(isBlitzEligible(boolean)).toBe(false)
  })
})

describe('blitzPool', () => {
  it('keeps only eligible questions, in order', () => {
    const pool = blitzPool([qcm('a', 4, 1), qcm('b', 5, 1), qcm('c', 4, 1)])
    expect(pool.map((q) => q.id)).toEqual(['a', 'c'])
  })

  it('a game is at most 100 questions of 10 seconds, over after 3 errors', () => {
    expect(BLITZ_QUESTION_COUNT).toBe(100)
    expect(BLITZ_SECONDS).toBe(10)
    expect(BLITZ_MAX_ERRORS).toBe(3)
  })
})
