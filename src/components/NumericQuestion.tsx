import type { NumericQuestion as Question, UserAnswer } from '../types/quiz'
import { formatNumericValue } from '../utils/number'

export function NumericQuestion({ question, answer, onChange }: { question: Question; answer?: UserAnswer; onChange: (value: string) => void }) {
  const { min, max, step, unit, isYear } = question.content
  const value = typeof answer === 'string' && answer !== '' ? Number(answer) : Math.round((min + max) / 2)
  const suffix = unit ? ` ${unit}` : ''
  const show = (n: number) => `${formatNumericValue(n, isYear, undefined, unit)}${suffix}`
  return <div className="numeric">
    <input type="range" className="numeric-range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    <div className="numeric-value">{show(value)}</div>
    <div className="numeric-bounds"><span>{show(min)}</span><span>{show(max)}</span></div>
  </div>
}
