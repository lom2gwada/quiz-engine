import { describe, expect, it } from 'vitest'
import type { Question } from '../types/quiz'
import { sampleQuestions } from './quizSample'

const q = (id: string, type: Question['type']) => ({ id, type }) as unknown as Question

describe('sampleQuestions', () => {
  const pool = [q('a1', 'qcm'), q('a2', 'qcm'), q('a3', 'qcm'), q('b1', 'boolean'), q('c1', 'numeric'), q('c2', 'numeric')]

  it('prend une question de chaque type avant d’en reprendre une deuxième', () => {
    expect(sampleQuestions(pool, 4).map((x) => x.id)).toEqual(['a1', 'b1', 'c1', 'a2'])
  })

  it('s’arrête au nombre demandé ou à la taille du quiz', () => {
    expect(sampleQuestions(pool, 2)).toHaveLength(2)
    expect(sampleQuestions(pool, 50)).toHaveLength(6)
    expect(sampleQuestions([], 5)).toEqual([])
  })
})
