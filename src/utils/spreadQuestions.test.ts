import { describe, expect, it } from 'vitest'
import type { Question } from '../types/quiz'
import { spreadQuestions } from './spreadQuestions'

const q = (id: string, subject: string | undefined, category: string) => ({ id, subject, category }) as unknown as Question
const ids = (list: Question[]) => list.map((item) => item.id)

describe('spreadQuestions', () => {
  it('sépare deux questions consécutives sur le même sujet', () => {
    const result = spreadQuestions([q('a1', 'or', 'cat'), q('a2', 'or', 'periode'), q('b1', 'argent', 'cat'), q('c1', 'fer', 'cat')])
    for (let i = 1; i < result.length; i += 1) expect(result[i].subject).not.toBe(result[i - 1].subject)
    expect(result).toHaveLength(4)
  })

  it('préfère aussi une autre catégorie quand c’est possible', () => {
    const result = spreadQuestions([q('a', 'x', 'altitude'), q('b', 'y', 'altitude'), q('c', 'z', 'capitale'), q('d', 'w', 'altitude')])
    expect(ids(result)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('ne touche pas à une série déjà variée', () => {
    const list = [q('a', 'x', 'c1'), q('b', 'y', 'c2'), q('c', 'z', 'c1')]
    expect(ids(spreadQuestions(list))).toEqual(['a', 'b', 'c'])
  })

  it('garde toutes les questions quand le pool ne permet pas de séparer (un seul sujet)', () => {
    const list = [q('a', 'x', 'c1'), q('b', 'x', 'c2'), q('c', 'x', 'c3')]
    expect(ids(spreadQuestions(list))).toEqual(['a', 'b', 'c'])
  })

  it('une question sans sujet ne compte pas comme un doublon', () => {
    const list = [q('a', undefined, 'c1'), q('b', undefined, 'c2'), q('c', 'x', 'c1')]
    expect(ids(spreadQuestions(list))).toEqual(['a', 'b', 'c'])
  })

  it('est déterministe et ne modifie pas la liste reçue', () => {
    const list = [q('a1', 'or', 'c'), q('a2', 'or', 'c'), q('b', 'fer', 'c'), q('c', 'or', 'd')]
    const copy = [...list]
    expect(ids(spreadQuestions(list))).toEqual(ids(spreadQuestions(list)))
    expect(list).toEqual(copy)
  })

  it('traite une grande série sans ralentir', () => {
    const big = Array.from({ length: 4000 }, (_, i) => q(String(i), `s${Math.floor(i / 4)}`, `c${i % 7}`))
    const result = spreadQuestions(big)
    expect(result).toHaveLength(4000)
    for (let i = 1; i < result.length; i += 1) expect(result[i].subject).not.toBe(result[i - 1].subject)
  })
})
