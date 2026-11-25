import type { AnswersByQuestion, Question } from '../types/quiz'
import type { TFunction } from '../i18n'
import { getT } from '../i18n'
import { matchAnswer } from './answerMatch'
import { formatNumericValue } from './number'

/** Traducteur par défaut (français) pour les helpers appelés hors composant / dans les tests. */
const frT = getT()

const sameIds = (left: string[], right: string[]) => left.length === right.length && left.every((item) => right.includes(item))

export function isCorrect(question: Question, answer: AnswersByQuestion[string] | undefined): boolean {
  if (question.type === 'text' || question.type === 'cloze') {
    if (typeof answer !== 'string') return false
    return matchAnswer(question.category, answer, question.content.expectedAnswers, question.content.caseSensitive)
  }
  if (question.type === 'map') return typeof answer === 'string' && answer === question.content.target
  if (question.type === 'numeric') {
    if (typeof answer !== 'string' || answer === '') return false
    const value = Number(answer)
    return Number.isFinite(value) && Math.abs(value - question.content.target) <= question.content.tolerance
  }
  if (!Array.isArray(answer)) return false
  if (question.type === 'ordering') return answer.every((id, index) => id === question.content.correctOrder[index]) && answer.length === question.content.correctOrder.length
  if (question.type === 'boolean') return answer[0] === String(question.content.isTrue)
  if (question.type === 'matching') {
    const expected = question.content.correctPairs
    const given: Record<string, string> = {}
    answer.forEach((token) => {
      const [left, right] = token.split(':')
      if (left && right) given[left] = right
    })
    const keys = Object.keys(expected)
    return keys.length === Object.keys(given).length && keys.every((left) => given[left] === expected[left])
  }
  return sameIds(answer, question.content.answers.filter((item) => item.isCorrect).map((item) => item.id))
}

export function userAnswer(question: Question, answer: AnswersByQuestion[string] | undefined, t: TFunction = frT): string {
  const none = t('result.noAnswer')
  if (question.type === 'text' || question.type === 'cloze') return typeof answer === 'string' && answer.trim() ? answer : none
  if (question.type === 'map') return typeof answer === 'string' && answer ? (question.content.labels[answer] ?? answer) : none
  if (question.type === 'numeric') {
    if (typeof answer !== 'string' || answer === '') return none
    const suffix = question.content.unit ? ` ${question.content.unit}` : ''
    return `${formatNumericValue(Number(answer), question.content.isYear, undefined, question.content.unit)}${suffix}`
  }
  if (!Array.isArray(answer) || !answer.length) return none
  if (question.type === 'ordering') return answer.map((id) => question.content.items.find((item) => item.id === id)?.label).join(' → ')
  if (question.type === 'boolean') return answer[0] === 'true' ? t('bool.true') : t('bool.false')
  if (question.type === 'matching') {
    const pairs = answer.map((token) => {
      const [leftId, rightId] = token.split(':')
      const left = question.content.left.find((item) => item.id === leftId)
      const right = question.content.right.find((item) => item.id === rightId)
      return left && right ? `${left.label} → ${right.label}` : null
    }).filter(Boolean)
    return pairs.length ? pairs.join(', ') : none
  }
  return answer.map((id) => question.content.answers.find((item) => item.id === id)?.label).join(', ')
}

export function correctAnswer(question: Question, t: TFunction = frT): string {
  if (question.type === 'text' || question.type === 'cloze') return Array.from(new Set(question.content.expectedAnswers)).join(t('common.or'))
  if (question.type === 'map') return question.content.labels[question.content.target] ?? question.content.target
  if (question.type === 'numeric') {
    const { target, tolerance, unit, isYear } = question.content
    const suffix = unit ? ` ${unit}` : ''
    const shown = `${formatNumericValue(target, isYear, undefined, unit)}${suffix}`
    return tolerance > 0 ? `${shown} (± ${formatNumericValue(tolerance, isYear, undefined, unit)}${suffix})` : shown
  }
  if (question.type === 'ordering') return question.content.correctOrder.map((id) => question.content.items.find((item) => item.id === id)?.label).join(' → ')
  if (question.type === 'boolean') return question.content.isTrue ? t('bool.true') : t('bool.false')
  if (question.type === 'matching') {
    return question.content.left.map((left) => {
      const right = question.content.right.find((item) => item.id === question.content.correctPairs[left.id])
      return `${left.label} → ${right?.label ?? '?'}`
    }).join(', ')
  }
  return question.content.answers.filter((answer) => answer.isCorrect).map((answer) => answer.label).join(', ')
}
