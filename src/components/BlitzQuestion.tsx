import { useEffect } from 'react'
import type { QCMQuestion } from '../types/quiz'
import { playClick } from '../utils/sound'

/** Les 4 réponses en carré 2 × 2, une case par réponse : un clic (ou la touche 1 à 4) valide et passe à la suite. */
export function BlitzQuestion({ question, onPick }: { question: QCMQuestion; onPick: (answerId: string) => void }) {
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
    {answers.map((answer, index) => <button
      key={answer.id}
      type="button"
      className={`blitz-square blitz-square-${index + 1}`}
      onClick={() => { playClick(); onPick(answer.id) }}
    >
      <span className="blitz-key" aria-hidden="true">{index + 1}</span>
      <span className="blitz-label">{answer.label}</span>
    </button>)}
  </div>
}
