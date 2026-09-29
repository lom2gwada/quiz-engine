import { useEffect, useState } from 'react'
import type { Question, Quiz } from '../types/quiz'
import { plural, useT } from '../i18n'
import { computeReviewQueue, fetchQuestionResults, resolveReviewQuestions, REVIEW_BATCH_SIZE } from '../utils/quizHistory'

/** Carte « Réviser » de l'accueil : un lot des questions dues (boîtes de Leitner — mêmes « Questions à
 *  retravailler » que dans l'historique), pour ne pas devoir toutes les reprendre d'un coup si elles sont
 *  nombreuses. Rien à afficher tant qu'aucune n'est due. */
export function ReviewPanel({ quiz, historyKey, userId, onReview }: { quiz: Quiz; historyKey: string; userId?: string | null; onReview: (questions: Question[]) => void }) {
  const t = useT()
  const [dueCount, setDueCount] = useState(0)
  const [batch, setBatch] = useState<Question[]>([])

  useEffect(() => {
    let cancelled = false
    fetchQuestionResults(userId).then((rows) => {
      if (cancelled) return
      const due = computeReviewQueue(rows, historyKey)
      setDueCount(due.length)
      setBatch(resolveReviewQuestions(due.slice(0, REVIEW_BATCH_SIZE), quiz.questions))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [quiz, historyKey, userId])

  if (!batch.length) return null
  return <section className="daily-panel review-panel">
    <div className="daily-head"><h3>📚 {t('review.title')}</h3></div>
    <p>{t(plural('history.toReview', dueCount), { n: dueCount })}</p>
    <button type="button" onClick={() => onReview(batch)}>{t(plural('review.play', batch.length), { n: batch.length })}</button>
  </section>
}
