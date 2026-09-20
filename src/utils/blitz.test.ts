import { describe, expect, it } from 'vitest'
import type { Question } from '../types/quiz'
import type { QuizResultRow } from '../types/history'
import { BLITZ_LIVES_SINCE, BLITZ_MAX_ERRORS, BLITZ_QUESTION_COUNT, BLITZ_SECONDS, blitzPool, blitzStats, isBlitzEligible, previousBestBlitz } from './blitz'

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

describe('blitzStats', () => {
  // qcm(id, 4, 1) : la bonne réponse est l'option « 0 »
  const questions = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => qcm(id, 4, 1))

  it('counts correct answers and the longest streak; unanswered counts wrong', () => {
    const answers = { a: ['0'], b: ['0'], c: ['1'], d: ['0'], e: ['0'], f: ['0'] }
    expect(blitzStats(questions, answers)).toEqual({ played: 6, correct: 5, bestStreak: 3 })
    expect(blitzStats(questions.slice(0, 3), { a: ['0'], b: ['0'] })).toEqual({ played: 3, correct: 2, bestStreak: 2 })
  })

  it('handles a game with no correct answer', () => {
    expect(blitzStats(questions.slice(0, 2), {})).toEqual({ played: 2, correct: 0, bestStreak: 0 })
  })
})

describe('previousBestBlitz', () => {
  const row = (over: Partial<QuizResultRow>): QuizResultRow => ({
    id: 'x', created_at: '2026-09-21T10:00:00Z', quiz_title: 'Q', mode: 'blitz', score: 0, earned_points: 0, total_points: 0,
    correct_count: 0, elapsed_seconds: 0, question_count: 0, categories: [], by_category: {}, by_type: {}, by_difficulty: {}, ...over,
  })

  it('takes the best blitz score of this quiz, ignoring other modes and other quizzes', () => {
    const rows = [row({ correct_count: 12 }), row({ correct_count: 30 }), row({ correct_count: 99, mode: 'classic' }), row({ correct_count: 80, quiz_title: 'Autre' })]
    expect(previousBestBlitz(rows, 'Q')).toBe(30)
  })

  it('ignores games played before the 3-error rule, and returns null without history', () => {
    const old = row({ correct_count: 90, created_at: '2026-09-19T12:00:00Z' })
    expect(old.created_at < BLITZ_LIVES_SINCE).toBe(true)
    expect(previousBestBlitz([old], 'Q')).toBeNull()
    expect(previousBestBlitz([], 'Q')).toBeNull()
  })
})
