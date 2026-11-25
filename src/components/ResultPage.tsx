import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import type { DatasetMap } from '../types/app'
import type { AnswersByQuestion, Category, Question } from '../types/quiz'
import type { MessageKey, TFunction } from '../i18n'
import { plural, useLocale, useT } from '../i18n'
import { isCorrect } from '../utils/answerCheck'
import { difficultyLabel } from './QuizPage'
import { formatDuration } from '../utils/time'
import { playFinish, playVictory } from '../utils/sound'
import { Confetti } from './Confetti'
import { PieChart } from './PieChart'
import { CorrectionList } from './CorrectionList'
import { ResultActions } from './ResultActions'

// Réexportés : d'autres modules importent encore la correction depuis la page de résultat.
export { correctAnswer, isCorrect, userAnswer } from '../utils/answerCheck'

function correctnessBreakdown<T extends string>(t: TFunction, questions: Question[], answers: AnswersByQuestion, keyOf: (question: Question) => T, labelOf: (key: T) => string) {
  const keys = Array.from(new Set(questions.map(keyOf)))
  return keys.map((key) => {
    const group = questions.filter((question) => keyOf(question) === key)
    const correct = group.filter((question) => isCorrect(question, answers[question.id])).length
    return {
      key,
      label: labelOf(key),
      correct,
      total: group.length,
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
  /** Carte / tableau de l'appli : rendu en correction des questions « Cliquez sur X » (bonne case + réponse donnée). */
  renderMap?: DatasetMap['render']
  answers: AnswersByQuestion
  categories: Category[]
  elapsedSeconds: number
  /** Absent quand relancer n'a pas de sens (reprise ciblée de ses erreurs). */
  onRestartSame?: () => void
  onBackToSettings: () => void
  onViewHistory: () => void
  /** Ouvre la fiche du sujet d'une question ; absent s'il n'y a pas de jeu de données (quiz JSON importé). */
  onViewFiche?: (subject: string) => void
  /** Question de groupe (classement, association) : ouvre les fiches de ses éléments, parcourables dans la modale. */
  onViewFiches?: (subjects: string[]) => void
  /** Bloc affiché sous le score (bilan blitz…). */
  summary?: ReactNode
}

export function ResultPage({ questions, renderMap, answers, categories, elapsedSeconds, onRestartSame, onBackToSettings, onViewHistory, onViewFiche, onViewFiches, summary }: ResultPageProps) {
  const t = useT()
  const earned = questions.filter((question) => isCorrect(question, answers[question.id])).reduce((total, question) => total + question.points, 0)
  const total = questions.reduce((sum, question) => sum + question.points, 0)
  const score = total ? Math.round((earned / total) * 100) : 0
  const { emoji, key } = mention(score)
  const byCategory = correctnessBreakdown(t, questions, answers, (question) => question.category, (id) => categories.find((category) => category.id === id)?.label ?? id)
  const byDifficulty = correctnessBreakdown(t, questions, answers, (question) => question.difficulty, (difficulty) => difficultyLabel(difficulty, t))
  const locale = useLocale()
  // « 3 / 5 réussies (60 %) » : ce que le graphique ne dit pas à qui ne voit pas ses couleurs.
  const successRate = ({ correct, total: count }: { correct: number; total: number }) => t(plural('result.successRate', count, locale), { correct, total: count, percent: count ? Math.round((correct / count) * 100) : 0 })
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
    {summary}
    <ResultActions onRestartSame={onRestartSame} onBackToSettings={onBackToSettings} />
    <div className="nav-links">
      <button type="button" className="secondary" onClick={onViewHistory}>🕓 {t('nav.history')}</button>
    </div>
    <details className="result-breakdown">
      <summary>{t('result.breakdownTitle')}</summary>
      <div className="stats-groups">
      <div className="stats-group">
        <h3 className="stats-group-title">{t('result.byCategory')}</h3>
        <div className="stats-grid">{byCategory.map((group) => <PieChart key={`category-${group.key}`} title={group.label} summary={successRate(group)} data={group.data} />)}</div>
      </div>
      <div className="stats-group">
        <h3 className="stats-group-title">{t('result.byDifficulty')}</h3>
        <div className="stats-grid">{byDifficulty.map((group) => <PieChart key={`difficulty-${group.key}`} title={group.label} summary={successRate(group)} data={group.data} />)}</div>
      </div>
      </div>
    </details>
    <CorrectionList items={questions.map((question) => ({ key: question.id, question, answer: answers[question.id] }))} renderMap={renderMap} onViewFiche={onViewFiche} onViewFiches={onViewFiches} onRestartSame={onRestartSame} onBackToSettings={onBackToSettings} />
  </section>
}
