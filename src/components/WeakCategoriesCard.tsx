import { useEffect, useState } from 'react'
import type { Quiz } from '../types/quiz'
import type { QuizResultRow } from '../types/history'
import { useT } from '../i18n'
import { fetchQuizHistory, sumBuckets } from '../utils/quizHistory'
import { WEAK_MIN_QUESTIONS, weakCategories, type WeakCategory } from '../utils/historyView'

/** Les catégories à travailler d'après les parties de ce quiz (voir `weakCategories`). */
export function weakCategoriesOf(rows: QuizResultRow[], historyKey: string, quiz: Quiz): WeakCategory[] {
  const buckets = sumBuckets(rows.filter((row) => row.quiz_title === historyKey), (row) => row.by_category)
  return weakCategories(buckets, quiz.categories.map((category) => category.id))
}

/** Carte « Points faibles » : les catégories retenues avec leur taux de réussite, et un bouton qui les pré-coche dans les
 *  filtres de l'accueil. `applied` : ces catégories (et elles seules) sont déjà cochées. */
export function WeakCategoriesCard({ weak, quiz, applied, onPractice }: { weak: WeakCategory[]; quiz: Quiz; applied: boolean; onPractice: (categoryIds: string[]) => void }) {
  const t = useT()
  const name = (id: string) => quiz.categories.find((category) => category.id === id)?.label ?? id
  return <section className="daily-panel weak-panel">
    <div className="daily-head"><h3>🎯 {t('weak.title')}</h3></div>
    <p>{t('weak.intro', { min: WEAK_MIN_QUESTIONS })}</p>
    <ul className="weak-list">
      {weak.map((item) => <li key={item.id}><span className="weak-name">{name(item.id)}</span><span className="weak-detail">{t('weak.detail', { percent: item.percent, total: item.total })}</span></li>)}
    </ul>
    <button type="button" onClick={() => onPractice(weak.map((item) => item.id))}>{t('weak.play')}</button>
    <p className="daily-note" role="status">{applied ? t('weak.applied') : ''}</p>
  </section>
}

/** Version de l'accueil : charge l'historique et ne montre rien tant qu'il n'y a pas de point faible mesurable. */
export function WeakCategoriesPanel({ quiz, historyKey, userId, selectedCategories, onPractice }: { quiz: Quiz; historyKey: string; userId?: string | null; selectedCategories: string[]; onPractice: (categoryIds: string[]) => void }) {
  const [rows, setRows] = useState<QuizResultRow[]>([])
  useEffect(() => {
    let cancelled = false
    fetchQuizHistory(userId).then((next) => { if (!cancelled) setRows(next) }).catch(() => {})
    return () => { cancelled = true }
  }, [userId])

  const weak = weakCategoriesOf(rows, historyKey, quiz)
  if (!weak.length) return null
  const applied = selectedCategories.length === weak.length && weak.every((item) => selectedCategories.includes(item.id))
  return <WeakCategoriesCard weak={weak} quiz={quiz} applied={applied} onPractice={onPractice} />
}
