import { useEffect, useMemo, useState } from 'react'
import type { AnswersByQuestion, Difficulty, Question, Quiz } from '../types/quiz'
import type { MessageKey, TFunction } from '../i18n'
import { useT } from '../i18n'
import { formatDuration } from '../utils/time'
import { shuffle } from '../utils/shuffle'
import { isCorrect } from './ResultPage'
import { QuestionImage } from './QuestionImage'
import { QuestionRenderer } from './QuestionRenderer'
import { QuestionShape } from './QuestionShape'

export const TYPE_ICONS: Record<Question['type'], string> = { qcm: '🧩', code: '💻', text: '✍️', ordering: '🔀', boolean: '⚖️', cloze: '📝', matching: '🔗', numeric: '🎚️' }
export const QUESTION_TYPES: Question['type'][] = ['qcm', 'code', 'text', 'ordering', 'boolean', 'cloze', 'matching', 'numeric']

export const typeLabel = (type: Question['type'], t: TFunction): string => t(`type.${type}` as MessageKey)
export const difficultyLabel = (difficulty: Difficulty, t: TFunction): string => t(`difficulty.${difficulty}` as MessageKey)

/** 'classic' : nombre de questions fixé à l'avance, on les parcourt toutes.
 * 'timeAttack' : contre la montre — on avance dans un grand pool tant que le temps le permet.
 * 'noMistake' : sans-faute — temps illimité, la partie s'arrête à la première erreur. */
export type GameMode = 'classic' | 'timeAttack' | 'noMistake'

/** Mélange les options de réponse une fois par question, pour que la bonne réponse ne soit pas toujours au même endroit. */
function withShuffledAnswers(question: Question): Question {
  if (question.type === 'qcm') return { ...question, content: { ...question.content, answers: shuffle(question.content.answers) } }
  if (question.type === 'code') return { ...question, content: { ...question.content, answers: shuffle(question.content.answers) } }
  return question
}

interface QuizPageProps {
  quiz: Quiz
  questions: Question[]
  mode?: GameMode
  /** Contre la montre uniquement : durée en secondes ; absent = illimité. */
  timeLimitSeconds?: number
  onFinish: (answers: AnswersByQuestion, elapsedSeconds: number, shown: Question[]) => void
  onCancel: () => void
}

export function QuizPage({ quiz, questions, mode = 'classic', timeLimitSeconds, onFinish, onCancel }: QuizPageProps) {
  const t = useT()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<AnswersByQuestion>({})
  const [elapsed, setElapsed] = useState(0)
  const shuffledQuestions = useMemo(() => questions.map(withShuffledAnswers), [questions])
  const question = shuffledQuestions[current]
  const timeAttack = mode === 'timeAttack'
  const noMistake = mode === 'noMistake'
  const remaining = timeAttack && timeLimitSeconds !== undefined ? Math.max(0, timeLimitSeconds - elapsed) : undefined
  const unlimited = remaining === undefined && (timeAttack || noMistake)
  const atEnd = current === shuffledQuestions.length - 1
  const updateAnswer = (answer: AnswersByQuestion[string]) => setAnswers((previous) => ({ ...previous, [question.id]: answer }))
  const cancelQuiz = () => { if (window.confirm(t('quiz.abandonConfirm'))) onCancel() }
  const finish = () => onFinish(answers, elapsed, shuffledQuestions.slice(0, current + 1))
  // Sans-faute : on ne compte que les questions déjà validées, jamais celle en cours (l'utilisateur
  // « banque » son score sans risquer la question affichée).
  const bank = () => onFinish(answers, elapsed, shuffledQuestions.slice(0, current))
  const validate = () => {
    if (!isCorrect(question, answers[question.id]) || atEnd) finish()
    else setCurrent((value) => value + 1)
  }

  useEffect(() => {
    const interval = setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Contre la montre à durée fixe : fin automatique dès que le temps est écoulé.
  useEffect(() => {
    if (timeAttack && timeLimitSeconds !== undefined && elapsed >= timeLimitSeconds) finish()
  }, [elapsed])

  if (!question) return <section className="empty"><h2>{t('quiz.noQuestion')}</h2><p>{t('quiz.noQuestionHint')}</p><button type="button" className="secondary" onClick={onCancel}>{t('common.back')}</button></section>
  const category = quiz.categories.find((item) => item.id === question.category)?.label ?? question.category
  const answeredCount = Object.keys(answers).length
  return <section className="quiz-card">
    <div className="question-meta">
      <span>{TYPE_ICONS[question.type]} {typeLabel(question.type, t)}</span><span>{category}</span><span>{difficultyLabel(question.difficulty, t)}</span><span>{t('quiz.points', { n: question.points })}</span>
      <span>⏱ {formatDuration(remaining ?? elapsed)}{unlimited ? ` · ${t('quiz.unlimited')}` : ''}</span>
    </div>
    {mode === 'classic' && <div className="quiz-progress"><div className="quiz-progress-fill" style={{ width: `${((current + 1) / shuffledQuestions.length) * 100}%` }} /></div>}
    {timeAttack && remaining !== undefined && <div className="quiz-progress"><div className="quiz-progress-fill quiz-progress-countdown" style={{ width: `${(remaining / timeLimitSeconds!) * 100}%` }} /></div>}
    <p className="progress">{noMistake
      ? t(current === 1 ? 'quiz.streak.one' : 'quiz.streak.other', { n: current })
      : timeAttack
        ? t(answeredCount === 1 ? 'quiz.answered.one' : 'quiz.answered.other', { n: answeredCount })
        : t('quiz.progress', { current: current + 1, total: shuffledQuestions.length })}</p>
    <div className="question-body" key={question.id}>
      {question.imageUrl && <QuestionImage src={question.imageUrl} alt={question.imageAlt} />}
      {question.shapeSvg && <QuestionShape svg={question.shapeSvg} alt={question.imageAlt} />}
      {question.type !== 'cloze' && <h2>{question.question}</h2>}
      <QuestionRenderer question={question} answer={answers[question.id]} onChange={updateAnswer} />
    </div>
    {(timeAttack || noMistake) && atEnd && <p className="hint-banner">{t('quiz.poolExhausted')}</p>}
    <div className="quiz-actions">
      <button type="button" className="secondary" onClick={cancelQuiz}>{t('common.cancel')}</button>
      <div className="quiz-nav">
        {mode === 'classic' && <button type="button" className="secondary" onClick={() => setCurrent((value) => value - 1)} disabled={current === 0}>{t('quiz.previous')}</button>}
        {timeAttack && !atEnd && <button type="button" className="secondary" onClick={finish}>{t('quiz.stop')}</button>}
        {noMistake && current > 0 && <button type="button" className="secondary" onClick={bank}>{t('quiz.stop')}</button>}
        {noMistake
          ? <button type="button" onClick={validate}>{t('quiz.validate')}</button>
          : atEnd
            ? <button type="button" onClick={finish}>{t('quiz.finish')}</button>
            : <button type="button" onClick={() => setCurrent((value) => value + 1)}>{t('quiz.next')}</button>}
      </div>
    </div>
  </section>
}
