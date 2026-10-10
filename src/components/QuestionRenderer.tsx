import type { Question, UserAnswer } from '../types/quiz'
import type { DatasetMap } from '../types/app'
import { BooleanQuestion } from './BooleanQuestion'
import { ClozeQuestion } from './ClozeQuestion'
import { CodeQuestion } from './CodeQuestion'
import { MatchingQuestion } from './MatchingQuestion'
import { NumericQuestion } from './NumericQuestion'
import { OrderingQuestion } from './OrderingQuestion'
import { QCMQuestion } from './QCMQuestion'
import { TextQuestion } from './TextQuestion'

export function QuestionRenderer({ question, answer, onChange, onSubmit, renderMap }: { question: Question; answer?: UserAnswer; onChange: (answer: UserAnswer) => void; onSubmit?: () => void; renderMap?: DatasetMap['render'] }) {
  switch (question.type) {
    case 'qcm': return <QCMQuestion question={question} answer={answer} onChange={onChange} />
    case 'text': return <TextQuestion question={question} answer={answer} onChange={onChange} onSubmit={onSubmit} />
    case 'code': return <CodeQuestion question={question} answer={answer} onChange={onChange} />
    case 'ordering': return <OrderingQuestion question={question} answer={answer} onChange={onChange} />
    case 'boolean': return <BooleanQuestion question={question} answer={answer} onChange={onChange} />
    case 'cloze': return <ClozeQuestion question={question} answer={answer} onChange={onChange} onSubmit={onSubmit} />
    case 'matching': return <MatchingQuestion question={question} answer={answer} onChange={onChange} />
    case 'map': return <>{renderMap?.({ target: question.content.target, selected: typeof answer === 'string' ? answer : undefined, onPick: onChange })}</>
    case 'numeric': return <NumericQuestion question={question} answer={answer} onChange={onChange} />
  }
}
