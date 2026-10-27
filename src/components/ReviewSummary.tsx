import { useT } from '../i18n'
import { LEITNER_BOX_COUNT, type ReviewChange } from '../utils/quizHistory'

/** Bilan d'une révision : combien de questions montent d'un niveau, restent au niveau maximum ou retombent au niveau 1,
 *  puis le détail question par question (repliable : un lot compte jusqu'à 20 questions). */
export function ReviewSummary({ changes }: { changes: ReviewChange[] }) {
  const t = useT()
  if (!changes.length) return null
  const up = changes.filter((change) => change.correct && change.after > change.before)
  const kept = changes.filter((change) => change.correct && change.after === change.before)
  const reset = changes.filter((change) => !change.correct)
  const line = (n: number, one: 'review.summary.up.one' | 'review.summary.keep.one' | 'review.summary.reset.one', other: 'review.summary.up.other' | 'review.summary.keep.other' | 'review.summary.reset.other') => t(n === 1 ? one : other, { n })
  return <div className="blitz-summary review-summary">
    <p><strong>📚 {t('review.summary.title')}</strong></p>
    {up.length > 0 && <p className="review-up">↑ {line(up.length, 'review.summary.up.one', 'review.summary.up.other')}</p>}
    {kept.length > 0 && <p>= {line(kept.length, 'review.summary.keep.one', 'review.summary.keep.other')}</p>}
    {reset.length > 0 && <p className="review-down">↓ {line(reset.length, 'review.summary.reset.one', 'review.summary.reset.other')}</p>}
    <details className="review-details">
      <summary>{t('review.summary.details')}</summary>
      <ul className="review-changes">
        {changes.map((change) => <li key={change.questionId} className={change.correct ? (change.after > change.before ? 'is-up' : 'is-kept') : 'is-down'}>
          <span className="review-change-text">{change.text}</span>
          <span className="review-change-levels">{t('review.summary.levels', { from: change.before, to: change.after, total: LEITNER_BOX_COUNT })}</span>
        </li>)}
      </ul>
    </details>
  </div>
}
