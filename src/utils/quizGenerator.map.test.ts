// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { generateQuiz, inferSchema, parseCsv } from './quizGenerator'
import { isBlitzEligible } from './blitz'
import { parseQuiz } from './quizValidation'
import { correctAnswer, isCorrect, userAnswer } from '../components/ResultPage'

const rows = parseCsv([
  'pays;article;capitale',
  'Cuba;;La Havane',
  'Haïti;;Port-au-Prince',
  'Jamaïque;la;Kingston',
  'Barbade;la;Bridgetown',
  'Bahamas;les;Nassau',
].join('\n'))
const schema = { ...inferSchema(rows), noun: 'territoire', title: 'Test' }
const mapQuestions = (quiz: ReturnType<typeof generateQuiz>) => quiz.questions.filter((q) => q.type === 'map')

describe('« Cliquez sur X » (questions de carte)', () => {
  it('are not generated unless the app provides map targets', () => {
    expect(mapQuestions(generateQuiz(rows, schema, { seed: 's' }))).toHaveLength(0)
  })

  it('generates one question per target on the map, in its own « Localisation » category', () => {
    const quiz = generateQuiz(rows, schema, { seed: 's', mapTargets: ['Cuba', 'Jamaïque', 'Absent'] })
    const questions = mapQuestions(quiz)
    expect(questions.map((q) => q.type === 'map' && q.content.target).sort()).toEqual(['Cuba', 'Jamaïque'])
    expect(quiz.categories.find((c) => c.id === 'map')?.label).toBe('Localisation')
    const jamaica = questions.find((q) => q.subject === 'Jamaïque')!
    expect(jamaica.question).toBe('Cliquez sur la Jamaïque sur la carte.')
    expect(jamaica.category).toBe('map')
  })

  it('does not change the other questions (same ids, same order — the daily challenge is drawn in that order)', () => {
    const plain = generateQuiz(rows, schema, { seed: 's' }).questions.map((q) => q.id)
    const withMap = generateQuiz(rows, schema, { seed: 's', mapTargets: ['Cuba'] }).questions.filter((q) => q.type !== 'map').map((q) => q.id)
    expect(withMap).toEqual(plain)
  })

  it('survives validation and is never a blitz question', () => {
    const quiz = parseQuiz(generateQuiz(rows, schema, { seed: 's', mapTargets: ['Cuba', 'Haïti'] }))
    const questions = mapQuestions(quiz)
    expect(questions).toHaveLength(2)
    expect(questions.some(isBlitzEligible)).toBe(false)
  })

  it('is correct only when the clicked territory is the target', () => {
    const [question] = mapQuestions(generateQuiz(rows, schema, { seed: 's', mapTargets: ['Cuba', 'Haïti'] })).filter((q) => q.subject === 'Cuba')
    expect(isCorrect(question, 'Cuba')).toBe(true)
    expect(isCorrect(question, 'Haïti')).toBe(false)
    expect(isCorrect(question, undefined)).toBe(false)
    expect(correctAnswer(question)).toBe('Cuba')
    expect(userAnswer(question, 'Haïti')).toBe('Haïti')
  })
})
