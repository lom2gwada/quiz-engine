import type { ClozeQuestion as Question, UserAnswer } from '../types/quiz'
import { useT } from '../i18n'
import { DictationButton } from './DictationButton'

const BLANK = /_{3,}/

export function ClozeQuestion({ question, answer, onChange, onSubmit }: { question: Question; answer?: UserAnswer; onChange: (value: string) => void; onSubmit?: () => void }) {
  const t = useT()
  const match = question.question.match(BLANK)
  const splitIndex = match?.index ?? question.question.length
  const before = question.question.slice(0, splitIndex)
  const after = question.question.slice(splitIndex + (match?.[0].length ?? 0))
  return <h2 className="cloze">
    {before}
    <input
      className="cloze-input"
      type="text"
      value={typeof answer === 'string' ? answer : ''}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => { if (event.key === 'Enter') onSubmit?.() }}
      aria-label={t('cloze.answerAria')}
    />
    <DictationButton onText={onChange} />
    {after}
  </h2>
}
