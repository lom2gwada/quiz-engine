import { useEffect } from 'react'
import type { NumericQuestion as Question, UserAnswer } from '../types/quiz'
import { formatNumericValue } from '../utils/number'

export function NumericQuestion({ question, answer, onChange }: { question: Question; answer?: UserAnswer; onChange: (value: string) => void }) {
  const { min, max, step, unit, isYear } = question.content
  const hasAnswer = typeof answer === 'string' && answer !== ''
  const value = hasAnswer ? Number(answer) : Math.round((min + max) / 2)
  const suffix = unit ? ` ${unit}` : ''
  const show = (n: number) => `${formatNumericValue(n, isYear, undefined, unit)}${suffix}`

  // Sans ça, une jauge jamais déplacée (déjà la bonne valeur au milieu, ou on passe directement à
  // la question suivante) laisse `answer` à `undefined` : compté faux alors que l'écran affiche la
  // bonne valeur. `question-body` est remonté à chaque question (`key={question.id}` dans
  // QuizPage), donc un effet sans dépendances suffit — pas besoin de surveiller `question.id`.
  useEffect(() => {
    if (!hasAnswer) onChange(String(value))
  }, [])

  return <div className="numeric">
    <input type="range" className="numeric-range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    <div className="numeric-value">{show(value)}</div>
    <div className="numeric-bounds"><span>{show(min)}</span><span>{show(max)}</span></div>
  </div>
}
