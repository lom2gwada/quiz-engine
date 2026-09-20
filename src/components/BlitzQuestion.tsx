import { useEffect } from 'react'
import type { QCMQuestion } from '../types/quiz'
import { useT } from '../i18n'
import { playClick } from '../utils/sound'
import { QuestionShape } from './QuestionShape'

/** Les 4 réponses en carré 2 × 2, une case par réponse (texte, drapeau ou silhouette) : un clic — ou la touche 1 à 4 —
 *  valide et passe à la suite. */
export function BlitzQuestion({ question, onPick }: { question: QCMQuestion; onPick: (answerId: string) => void }) {
  const t = useT()
  const { answers } = question.content

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const answer = answers[Number(event.key) - 1]
      if (answer) { playClick(); onPick(answer.id) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answers, onPick])

  return <div className="blitz-grid" role="group" aria-label={question.question}>
    {answers.map((answer, index) => {
      const visual = Boolean(answer.imageUrl || answer.shapeSvg)
      return <button
        key={answer.id}
        type="button"
        className={visual ? 'blitz-square has-visual' : 'blitz-square'}
        // Une case-image n'a pas de texte à lire : un nom neutre (le vrai nom trahirait la bonne réponse aux lecteurs d'écran).
        aria-label={visual ? t('quiz.blitzChoice', { n: index + 1 }) : undefined}
        onClick={() => { playClick(); onPick(answer.id) }}
      >
        <span className="blitz-key" aria-hidden="true">{index + 1}</span>
        {answer.imageUrl
          ? <img className="blitz-image" src={answer.imageUrl} alt="" draggable={false} />
          : answer.shapeSvg
            ? <QuestionShape svg={answer.shapeSvg} alt="" className="blitz-shape" />
            : <span className="blitz-label">{answer.label}</span>}
      </button>
    })}
  </div>
}
