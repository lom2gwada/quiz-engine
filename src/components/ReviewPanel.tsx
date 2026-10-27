import { useEffect, useState } from 'react'
import type { Question, Quiz } from '../types/quiz'
import { plural, useT } from '../i18n'
import { computeReviewQueue, fetchQuestionResults, resolveReviewQuestions, reviewBoxes, REVIEW_BATCH_SIZE } from '../utils/quizHistory'

/** Carte « Réviser » de l'accueil : un lot des questions dues (boîtes de Leitner — mêmes « Questions à
 *  retravailler » que dans l'historique), pour ne pas devoir toutes les reprendre d'un coup si elles sont
 *  nombreuses. Rien à afficher tant qu'aucune n'est due. */
export function ReviewPanel({ quiz, historyKey, userId, onReview }: { quiz: Quiz; historyKey: string; userId?: string | null; onReview: (questions: Question[], boxes: Record<string, number>) => void }) {
  const t = useT()
  const [dueCount, setDueCount] = useState(0)
  const [batch, setBatch] = useState<Question[]>([])
  const [boxes, setBoxes] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    fetchQuestionResults(userId).then((rows) => {
      if (cancelled) return
      // On ne garde que les questions rejouables dans le tirage courant AVANT de plafonner le lot : des
      // identifiants anciens (autre générateur, autre tirage) en tête de file videraient sinon tout le lot.
      const queue = computeReviewQueue(rows, historyKey)
      const playable = resolveReviewQuestions(queue, quiz.questions)
      setBoxes(reviewBoxes(queue))
      setDueCount(playable.length)
      setBatch(playable.slice(0, REVIEW_BATCH_SIZE))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [quiz, historyKey, userId])

  if (!batch.length) return null
  return <section className="daily-panel review-panel">
    <div className="daily-head"><h3>📚 {t('review.title')}</h3></div>
    <p>{t(plural('history.toReview', dueCount), { n: dueCount })}</p>
    <button type="button" onClick={() => onReview(batch, boxes)}>{t(plural('review.play', batch.length), { n: batch.length })}</button>
  </section>
}
