import type { QCMQuestion as Question, UserAnswer } from '../types/quiz'
import { playClick } from '../utils/sound'

export function QCMQuestion({ question, answer, onChange }: { question: Question; answer?: UserAnswer; onChange: (value: string[]) => void }) {
  const selected = Array.isArray(answer) ? answer : []
  const toggle = (id: string) => {
    playClick()
    onChange(question.content.multiple ? (selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]) : [id])
  }
  return <div className="answers">
    {question.content.answers.map((item) => <label className="answer" key={item.id}>
      <input type={question.content.multiple ? 'checkbox' : 'radio'} name={question.id} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
      {item.label}
    </label>)}
  </div>
}
