import { useEffect, useState } from 'react'
import type { AnswersByQuestion, Category, Question } from '../types/quiz'
import type { MessageKey, TFunction } from '../i18n'
import { getT, useT } from '../i18n'
import { difficultyLabel } from './QuizPage'
import { formatNumericValue } from '../utils/number'
import { formatDuration } from '../utils/time'
import { playFinish, playVictory } from '../utils/sound'
import { Confetti } from './Confetti'
import { PieChart } from './PieChart'
import { QuestionImage } from './QuestionImage'
import { QuestionShape } from './QuestionShape'

/** Traducteur par défaut (français) pour les helpers appelés hors composant / dans les tests. */
const frT = getT()

const sameIds = (left: string[], right: string[]) => left.length === right.length && left.every((item) => right.includes(item))

export function isCorrect(question: Question, answer: AnswersByQuestion[string] | undefined): boolean {
  if (question.type === 'text' || question.type === 'cloze') {
    if (typeof answer !== 'string') return false
    // Sauf en mode sensible : on tolère casse, accents, traits d'union / apostrophes / espaces
    // et l'article de tête (« Port-d'Espagne » ≈ « port d'espagne » ; « le peso » ≈ « peso »).
    const normalize = (value: string) => {
      const trimmed = value.trim()
      if (question.content.caseSensitive) return trimmed
      return trimmed
        .toLocaleLowerCase('fr')
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents (diacritiques U+0300–U+036F)
        .replace(/[-'‘’`\s]+/g, ' ') // traits d'union / apostrophes / espaces → une espace
        .replace(/^(le|la|les|l|the) /, '')
        .trim()
    }
    return question.content.expectedAnswers.map(normalize).includes(normalize(answer))
  }
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

function correctnessBreakdown<T extends string>(t: TFunction, questions: Question[], answers: AnswersByQuestion, keyOf: (question: Question) => T, labelOf: (key: T) => string) {
  const keys = Array.from(new Set(questions.map(keyOf)))
  return keys.map((key) => {
    const group = questions.filter((question) => keyOf(question) === key)
    const correct = group.filter((question) => isCorrect(question, answers[question.id])).length
    return {
      key,
      label: labelOf(key),
      data: [
        { label: t('result.passed'), value: correct, color: '#34d399' },
        { label: t('result.failed'), value: group.length - correct, color: '#fb7185' },
      ].filter((slice) => slice.value > 0),
    }
  })
}

function useAnimatedNumber(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(eased * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
  return value
}

function mention(score: number): { emoji: string; key: MessageKey } {
  if (score >= 90) return { emoji: '🏆', key: 'result.mention.excellent' }
  if (score >= 75) return { emoji: '👏', key: 'result.mention.veryGood' }
  if (score >= 50) return { emoji: '👍', key: 'result.mention.good' }
  if (score >= 25) return { emoji: '💪', key: 'result.mention.tryHarder' }
  return { emoji: '📚', key: 'result.mention.review' }
}

interface ResultPageProps {
  questions: Question[]
  answers: AnswersByQuestion
  categories: Category[]
  elapsedSeconds: number
  onRestart: () => void
  onViewHistory: () => void
  /** Ouvre la fiche du sujet d'une question ; absent s'il n'y a pas de jeu de données (quiz JSON importé). */
  onViewFiche?: (subject: string) => void
}

export function ResultPage({ questions, answers, categories, elapsedSeconds, onRestart, onViewHistory, onViewFiche }: ResultPageProps) {
  const t = useT()
  const earned = questions.filter((question) => isCorrect(question, answers[question.id])).reduce((total, question) => total + question.points, 0)
  const total = questions.reduce((sum, question) => sum + question.points, 0)
  const score = total ? Math.round((earned / total) * 100) : 0
  const { emoji, key } = mention(score)
  const byCategory = correctnessBreakdown(t, questions, answers, (question) => question.category, (id) => categories.find((category) => category.id === id)?.label ?? id)
  const byDifficulty = correctnessBreakdown(t, questions, answers, (question) => question.difficulty, (difficulty) => difficultyLabel(difficulty, t))
  const displayScore = useAnimatedNumber(score)
  useEffect(() => { score >= 90 ? playVictory() : playFinish() }, [])
  return <section className="results">
    {score >= 90 && <Confetti />}
    <div className="score">
      <p>{t('result.yourScore')}</p>
      <strong>{displayScore}%</strong>
      <span>{t('result.points', { earned, total })}</span>
      <p className="mention">{emoji} {t(key)}</p>
      <p className="duration">{t('result.time', { duration: formatDuration(elapsedSeconds) })}</p>
    </div>
    <button type="button" onClick={onRestart}>{t('result.restart')}</button>
    <div className="nav-links">
      <button type="button" className="secondary" onClick={onViewHistory}>🕓 {t('nav.history')}</button>
    </div>
    <div className="stats-groups">
      <div className="stats-group">
        <h3 className="stats-group-title">{t('result.byCategory')}</h3>
        <div className="stats-grid">{byCategory.map((group) => <PieChart key={`category-${group.key}`} title={t('result.categoryScore', { label: group.label })} data={group.data} />)}</div>
      </div>
      <div className="stats-group">
        <h3 className="stats-group-title">{t('result.byDifficulty')}</h3>
        <div className="stats-grid">{byDifficulty.map((group) => <PieChart key={`difficulty-${group.key}`} title={t('result.categoryScore', { label: group.label })} data={group.data} />)}</div>
      </div>
    </div>
    <div className="corrections">{questions.map((question) => {
      const correct = isCorrect(question, answers[question.id])
      return <article className={`correction ${correct ? 'correct' : 'incorrect'}`} key={question.id}>
        <h3>{correct ? t('result.correct') : t('result.incorrect')} — {question.question}</h3>
        {question.imageUrl && <QuestionImage src={question.imageUrl} alt={question.imageAlt} />}
        {question.shapeSvg && <QuestionShape svg={question.shapeSvg} alt={question.imageAlt} />}
        {!correct && <p><strong>{t('result.yourAnswer')}</strong> {userAnswer(question, answers[question.id], t)}</p>}
        {!correct && <p><strong>{t('result.goodAnswer')}</strong> {correctAnswer(question, t)}</p>}
        <p>{question.explanation}</p>
        {question.subject && onViewFiche && (
          <button type="button" className="link-button" onClick={() => onViewFiche(question.subject!)}>
            {t('result.viewFiche', { name: question.subjectLabel ?? question.subject })}
          </button>
        )}
      </article>
    })}</div>
  </section>
}

export function userAnswer(question: Question, answer: AnswersByQuestion[string] | undefined, t: TFunction = frT): string {
  const none = t('result.noAnswer')
  if (question.type === 'text' || question.type === 'cloze') return typeof answer === 'string' && answer.trim() ? answer : none
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
  if (question.type === 'text' || question.type === 'cloze') return question.content.expectedAnswers.join(t('common.or'))
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
