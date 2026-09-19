import { useEffect, useState } from 'react'
import type { Question, Quiz } from '../types/quiz'
import type { QuestionResultRow, QuizResultRow } from '../types/history'
import { useLocale, useT } from '../i18n'
import { bucketsToRadarPoints, computeMissedQuestions, computeRecords, fetchQuestionResults, fetchQuizHistory, sumBuckets } from '../utils/quizHistory'
import { formatDuration } from '../utils/time'
import { HeatmapChart } from './HeatmapChart'
import { LeaderboardPanel } from './LeaderboardPanel'
import { QUESTION_TYPES, difficultyLabel, typeLabel, type GameMode } from './QuizPage'
import { RadarChart } from './RadarChart'
import { ScoreChart } from './ScoreChart'

export const MODE_ICONS: Record<GameMode, string> = { classic: '🎯', timeAttack: '⏱️', noMistake: '🔥' }

export function HistoryPage({ onBack, quiz, historyKey, userId, onReplayMissed }: { onBack: () => void; quiz: Quiz; historyKey: string; userId?: string | null; onReplayMissed: (questions: Question[]) => void }) {
  const t = useT()
  const locale = useLocale()
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const longDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const typeName = (key: string) => (QUESTION_TYPES as string[]).includes(key) ? typeLabel(key as Question['type'], t) : key
  const diffName = (key: string) => ['easy', 'medium', 'hard'].includes(key) ? difficultyLabel(key as 'easy' | 'medium' | 'hard', t) : key
  // Les parties stockent l'id de catégorie (indépendant de la langue) ; on résout le libellé ici.
  // Anciennes lignes (libellé FR déjà stocké) : introuvable comme id → affiché tel quel.
  const catName = (key: string) => quiz.categories.find((category) => category.id === key)?.label ?? key
  const modeLabel = (mode: GameMode) => mode === 'timeAttack' ? t('start.mode.timeAttack') : mode === 'noMistake' ? t('start.mode.noMistake') : t('start.mode.classic')

  const [rows, setRows] = useState<QuizResultRow[] | null>(null)
  const [questionRows, setQuestionRows] = useState<QuestionResultRow[]>([])
  const [error, setError] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null)

  useEffect(() => {
    fetchQuizHistory(userId).then(setRows).catch(() => setError(t('history.loadError')))
    fetchQuestionResults(userId).then(setQuestionRows).catch(() => {})
  }, [t, userId])

  const quizTitles = rows ? Array.from(new Set(rows.map((row) => row.quiz_title))) : []
  const activeQuiz = selectedQuiz && quizTitles.includes(selectedQuiz) ? selectedQuiz : (quizTitles.includes(historyKey) ? historyKey : quizTitles[0])
  const quizRows = rows ? rows.filter((row) => row.quiz_title === activeQuiz) : null

  const records = quizRows ? computeRecords(quizRows) : null
  const chartPoints = quizRows ? [...quizRows].reverse().map((row) => ({ label: shortDate(row.created_at), score: row.score })) : []
  const byCategory = quizRows ? bucketsToRadarPoints(sumBuckets(quizRows, (row) => row.by_category), catName) : []
  const byType = quizRows ? bucketsToRadarPoints(sumBuckets(quizRows, (row) => row.by_type), typeName) : []
  const byDifficulty = quizRows ? bucketsToRadarPoints(sumBuckets(quizRows, (row) => row.by_difficulty), diffName) : []

  const missedQuestions = activeQuiz ? computeMissedQuestions(questionRows, activeQuiz) : []
  const canReplay = activeQuiz === historyKey
  const replayQuestions = canReplay
    ? missedQuestions.map((missed) => quiz.questions.find((question) => question.id === missed.questionId)).filter((question): question is Question => Boolean(question))
    : []

  return <section className="stats-page">
    <div className="stats-header">
      <h2>{t('history.title')}</h2>
      <button type="button" className="secondary" onClick={onBack}>{t('common.back')}</button>
    </div>
    {error && <p className="alert" role="alert">{error}</p>}
    {!error && !rows && <p>{t('common.loading')}</p>}
    {rows && !rows.length && <p>{t('history.empty')}</p>}
    {quizTitles.length > 1 && <label className="quiz-select">{t('history.quizLabel')}
      <select value={activeQuiz} onChange={(event) => setSelectedQuiz(event.target.value)}>
        {quizTitles.map((title) => <option key={title} value={title}>{title === historyKey ? quiz.metadata.title : title}</option>)}
      </select>
    </label>}
    {rows && <LeaderboardPanel quizTitle={activeQuiz || historyKey} userId={userId} />}
    {records && records.gamesPlayed > 0 && <>
      <div className="records-grid">
        <div className="record-tile"><span className="record-value">{records.gamesPlayed}</span><span className="record-label">{t('history.gamesPlayed')}</span></div>
        <div className="record-tile"><span className="record-value">{records.bestScore}%</span><span className="record-label">{t('history.bestScore')}</span></div>
        <div className="record-tile"><span className="record-value">{records.averageScore}%</span><span className="record-label">{t('history.avgScore')}</span></div>
        <div className="record-tile"><span className="record-value">{formatDuration(records.totalPlaytimeSeconds)}</span><span className="record-label">{t('history.totalTime')}</span></div>
        {records.bestTimeAttackCorrect > 0 && <div className="record-tile"><span className="record-value">{records.bestTimeAttackCorrect}</span><span className="record-label">{t('history.bestTimeAttack')}</span></div>}
        {records.bestStreak > 0 && <div className="record-tile"><span className="record-value">{records.bestStreak}</span><span className="record-label">{t('history.bestStreak')}</span></div>}
      </div>
      <ScoreChart points={chartPoints} />
      <div className="stats-groups">
        <div className="stats-group">
          <h3 className="stats-group-title">{t('result.byCategory')}</h3>
          <HeatmapChart points={byCategory} />
        </div>
        <div className="stats-group">
          <h3 className="stats-group-title">{t('history.byType')}</h3>
          <RadarChart points={byType} ariaLabel={t('history.byType')} />
        </div>
        <div className="stats-group">
          <h3 className="stats-group-title">{t('result.byDifficulty')}</h3>
          <RadarChart points={byDifficulty} ariaLabel={t('result.byDifficulty')} />
        </div>
      </div>
    </>}
    {missedQuestions.length > 0 && <div className="missed-questions">
      <div className="stats-group-header">
        <h3 className="stats-group-title">{t('history.toReview')}</h3>
        {replayQuestions.length > 0 && <button type="button" onClick={() => onReplayMissed(replayQuestions)}>{t('history.replayMistakes')}</button>}
      </div>
      <ul className="missed-list">
        {missedQuestions.map((missed) => <li className="missed-item" key={missed.questionId}>
          <span>{missed.questionText}</span>
          <span className="missed-ratio">{t('history.missedRatio', { wrong: missed.wrongCount, attempts: missed.attempts })}</span>
        </li>)}
      </ul>
    </div>}
    {quizRows && quizRows.length > 0 && <ul className="history-list">
      {quizRows.map((row) => <li className="history-item" key={row.id}>
        <span title={modeLabel(row.mode)} role="img" aria-label={modeLabel(row.mode)}>{MODE_ICONS[row.mode]}</span>
        <span className="history-score">{row.score}%</span>
        <span className="history-date">{longDate(row.created_at)}</span>
        <span className="history-categories">{row.categories.map(catName).join(', ')}</span>
        <span>{t('history.pointsPair', { earned: row.earned_points, total: row.total_points })}</span>
        <span>⏱ {formatDuration(row.elapsed_seconds)}</span>
      </li>)}
    </ul>}
  </section>
}
