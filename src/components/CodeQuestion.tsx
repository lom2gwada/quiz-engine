import type { CodeQuestion as Question, UserAnswer } from '../types/quiz'
import { QCMQuestion } from './QCMQuestion'

export function CodeQuestion({ question, answer, onChange }: { question: Question; answer?: UserAnswer; onChange: (value: string[]) => void }) {
  return <><pre><code>{question.content.snippet}</code></pre><QCMQuestion question={{ ...question, type: 'qcm', content: { multiple: false, answers: question.content.answers } }} answer={answer} onChange={onChange} /></>
}
