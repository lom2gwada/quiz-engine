import type { TextQuestion as Question, UserAnswer } from '../types/quiz'
import { useT } from '../i18n'

export function TextQuestion({ answer, onChange, onSubmit }: { question: Question; answer?: UserAnswer; onChange: (value: string) => void; onSubmit?: () => void }) {
  const t = useT()
  return <input
    className="text-answer"
    type="text"
    value={typeof answer === 'string' ? answer : ''}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={(event) => { if (event.key === 'Enter') onSubmit?.() }}
    placeholder={t('text.placeholder')}
  />
}
