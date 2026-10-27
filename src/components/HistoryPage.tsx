import { useEffect, useState } from 'react'
import type { Question, Quiz } from '../types/quiz'
import type { QuestionResultRow, QuizResultRow } from '../types/history'
import { plural, useLocale, useT } from '../i18n'
import { bucketsToRadarPoints, computeCategoryWeekHeatmap, computeRecords, computeReviewQueue, fetchQuestionResults, fetchQuizHistory, resolveReviewQuestions, reviewBoxes, sumBuckets, REVIEW_BATCH_SIZE } from '../utils/quizHistory'
import { formatDuration, formatLongDuration } from '../utils/time'
import { sortCategoryPoints, type CategorySort } from '../utils/historyView'
import { WeakCategoriesCard, weakCategoriesOf } from './WeakCategoriesCard'
import { CategoryWeekHeatmap } from './CategoryWeekHeatmap'
import { HeatmapChart } from './HeatmapChart'
import { LeaderboardPanel } from './LeaderboardPanel'
import { QUESTION_TYPES, difficultyLabel, typeLabel, type GameMode } from './QuizPage'
import { RadarChart } from './RadarChart'
import { ScoreChart } from './ScoreChart'
import { TabList, tabId, tabPanelId } from './TabList'

type HistoryTab = 'summary' | 'categories' | 'leaderboard' | 'games'

export const MODE_ICONS: Record<GameMode, string> = { classic: '🎯', timeAttack: '⏱️', noMistake: '🔥', blitz: '⚡' }

export function HistoryPage({ onBack, quiz, historyKey, userId, onReplayMissed, onPracticeWeak }: { onBack: () => void; quiz: Quiz; historyKey: string; userId?: string | null; onReplayMissed: (questions: Question[], boxes: Record<string, number>) => void; onPracticeWeak: (categoryIds: string[]) => void }) {
  const t = useT()
  const locale = useLocale()
  const shortDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const longDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const typeName = (key: string) => (QUESTION_TYPES as string[]).includes(key) ? typeLabel(key as Question['type'], t) : key
  const diffName = (key: string) => ['easy', 'medium', 'hard'].includes(key) ? difficultyLabel(key as 'easy' | 'medium' | 'hard', t) : key
  // Les parties stockent l'id de catégorie (indépendant de la langue) ; on résout le libellé ici.
  // Anciennes lignes (libellé FR déjà stocké) : introuvable comme id → affiché tel quel.
  const catName = (key: string) => quiz.categories.find((category) => category.id === key)?.label ?? key
  const modeLabel = (mode: GameMode) => mode === 'timeAttack' ? t('start.mode.timeAttack') : mode === 'noMistake' ? t('start.mode.noMistake') : mode === 'blitz' ? t('start.mode.blitz') : t('start.mode.classic')

  const [rows, setRows] = useState<QuizResultRow[] | null>(null)
  const [questionRows, setQuestionRows] = useState<QuestionResultRow[]>([])
  const [error, setError] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null)
  const [tab, setTab] = useState<HistoryTab>('summary')
  const [categorySort, setCategorySort] = useState<CategorySort>('weakest')

  useEffect(() => {
    fetchQuizHistory(userId).then(setRows).catch(() => setError(t('history.loadError')))
    fetchQuestionResults(userId).then(setQuestionRows).catch(() => {})
  }, [t, userId])

  const quizTitles = rows ? Array.from(new Set(rows.map((row) => row.quiz_title))) : []
  const activeQuiz = selectedQuiz && quizTitles.includes(selectedQuiz) ? selectedQuiz : (quizTitles.includes(historyKey) ? historyKey : quizTitles[0])
  const quizRows = rows ? rows.filter((row) => row.quiz_title === activeQuiz) : null

  const records = quizRows ? computeRecords(quizRows) : null
  const chartPoints = quizRows ? [...quizRows].reverse().map((row) => ({ label: shortDate(row.created_at), score: row.score })) : []
  const byCategory = quizRows ? sortCategoryPoints(bucketsToRadarPoints(sumBuckets(quizRows, (row) => row.by_category), catName), categorySort, locale) : []
  const byType = quizRows ? bucketsToRadarPoints(sumBuckets(quizRows, (row) => row.by_type), typeName) : []
  const byDifficulty = quizRows ? bucketsToRadarPoints(sumBuckets(quizRows, (row) => row.by_difficulty), diffName) : []

  // L'entraînement ciblé pré-coche les catégories du quiz courant : sans objet pour l'historique d'un autre quiz.
  const weak = rows && activeQuiz === historyKey ? weakCategoriesOf(rows, historyKey, quiz) : []

  const weekHeatmap = quizRows ? computeCategoryWeekHeatmap(quizRows) : null

  const dueQuestions = activeQuiz ? computeReviewQueue(questionRows, activeQuiz) : []
  const canReplay = activeQuiz === historyKey
  // Rejouables d'abord (identifiants anciens ou d'un autre tirage écartés), puis plafond du lot.
  const playable = canReplay ? resolveReviewQuestions(dueQuestions, quiz.questions) : []
  const dueCount = canReplay ? playable.length : dueQuestions.length
  const replayQuestions = playable.slice(0, REVIEW_BATCH_SIZE)

  // Onglets : résumé et catégories n'ont de sens qu'avec au moins une partie ; le classement est toujours là.
  const hasGames = Boolean(records && records.gamesPlayed > 0)
  const tabs: { id: HistoryTab; label: string }[] = [
    ...(hasGames ? [{ id: 'summary' as const, label: t('history.tabSummary') }, { id: 'categories' as const, label: t('history.tabCategories') }] : []),
    { id: 'leaderboard' as const, label: t('history.leaderboard') },
    ...(hasGames && records ? [{ id: 'games' as const, label: t('history.tabGames', { n: records.gamesPlayed }) }] : []),
  ]
  const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0].id

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
    {rows && <>
      <TabList tabs={tabs} value={activeTab} onChange={setTab} label={t('history.tabsLabel')} idPrefix="history" />
      <div role="tabpanel" id={tabPanelId('history')} aria-labelledby={tabId('history', activeTab)} className="tab-panel">
        {activeTab === 'summary' && records && <>
          {dueCount > 0 && <div className="missed-questions">
            <div className="stats-group-header">
              <h3 className="stats-group-title">{t(plural('history.toReview', dueCount), { n: dueCount })}</h3>
              {replayQuestions.length > 0 && <button type="button" onClick={() => onReplayMissed(replayQuestions, reviewBoxes(dueQuestions))}>{t(plural('review.play', replayQuestions.length), { n: replayQuestions.length })}</button>}
            </div>
          </div>}
          <div className="records-grid">
            <div className="record-tile"><span className="record-value">{records.gamesPlayed}</span><span className="record-label">{t('history.gamesPlayed')}</span></div>
            <div className="record-tile"><span className="record-value">{records.bestScore}%</span><span className="record-label">{t('history.bestScore')}</span></div>
            <div className="record-tile"><span className="record-value">{records.averageScore}%</span><span className="record-label">{t('history.avgScore')}</span></div>
            <div className="record-tile"><span className="record-value">{formatLongDuration(records.totalPlaytimeSeconds)}</span><span className="record-label">{t('history.totalTime')}</span></div>
            {records.bestTimeAttackCorrect > 0 && <div className="record-tile"><span className="record-value">{records.bestTimeAttackCorrect}</span><span className="record-label">{t('history.bestTimeAttack')}</span></div>}
            {records.bestStreak > 0 && <div className="record-tile"><span className="record-value">{records.bestStreak}</span><span className="record-label">{t('history.bestStreak')}</span></div>}
          </div>
          <ScoreChart points={chartPoints} />
          <div className="stats-groups">
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
        {activeTab === 'categories' && <>
          {weak.length > 0 && <WeakCategoriesCard weak={weak} quiz={quiz} applied={false} onPractice={onPracticeWeak} />}
          <div className="stats-group">
            <div className="stats-group-header">
              <h3 className="stats-group-title">{t('result.byCategory')}</h3>
              <div className="mode-toggle" role="group" aria-label={t('history.sortLabel')}>
                <button type="button" className={categorySort === 'weakest' ? 'mode-chip is-active' : 'mode-chip'} aria-pressed={categorySort === 'weakest'} onClick={() => setCategorySort('weakest')}>{t('history.sortWeakest')}</button>
                <button type="button" className={categorySort === 'alpha' ? 'mode-chip is-active' : 'mode-chip'} aria-pressed={categorySort === 'alpha'} onClick={() => setCategorySort('alpha')}>{t('history.sortAlpha')}</button>
              </div>
            </div>
            <HeatmapChart points={byCategory} />
          </div>
          {weekHeatmap && weekHeatmap.categories.length > 0 && <CategoryWeekHeatmap
            heatmap={weekHeatmap}
            title={t('history.weekHeatmapTitle')}
            labelOf={catName}
            note={weekHeatmap.truncated ? t('history.weekHeatmapNote', { count: weekHeatmap.categories.length }) : undefined}
          />}
        </>}
        {activeTab === 'leaderboard' && <LeaderboardPanel quizTitle={activeQuiz || historyKey} userId={userId} />}
        {activeTab === 'games' && quizRows && <ul className="history-list">
          {quizRows.map((row) => <li className="history-item" key={row.id}>
            <span title={modeLabel(row.mode)} role="img" aria-label={modeLabel(row.mode)}>{MODE_ICONS[row.mode]}</span>
            <span className="history-score">{row.score}%</span>
            <span className="history-date">{longDate(row.created_at)}</span>
            <span className="history-categories">{row.categories.map(catName).join(', ')}</span>
            <span>{t('history.pointsPair', { earned: row.earned_points, total: row.total_points })}</span>
            <span>⏱ {formatDuration(row.elapsed_seconds)}</span>
          </li>)}
        </ul>}
      </div>
    </>}
  </section>
}
