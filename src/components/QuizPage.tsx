import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnswersByQuestion, Difficulty, Question, Quiz } from '../types/quiz'
import type { MessageKey, TFunction } from '../i18n'
import { useLocale, useT } from '../i18n'
import { formatNumber } from '../utils/number'
import { formatDuration } from '../utils/time'
import { shuffle } from '../utils/shuffle'
import { BLITZ_MAX_ERRORS, BLITZ_SECONDS, speedBonusTenths } from '../utils/blitz'
import { playCorrect, playStreak, playTick, playWrong } from '../utils/sound'
import { preloadAnswerImages } from '../utils/preload'
import { rateColor } from '../utils/rateColor'
import { BlitzQuestion } from './BlitzQuestion'
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
 * 'noMistake' : sans-faute — temps illimité, la partie s'arrête à la première erreur.
 * 'blitz' : questions à 4 choix (cases 2 × 2), chacune limitée à quelques secondes ; un clic valide et passe à la suivante ;
 * la partie s'arrête à la 3e erreur (mauvaise réponse ou temps écoulé). */
export type GameMode = 'classic' | 'timeAttack' | 'noMistake' | 'blitz'

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
  /** `extra.speedBonus` : blitz uniquement, bonus de rapidité cumulé (en points). */
  onFinish: (answers: AnswersByQuestion, elapsedSeconds: number, shown: Question[], extra?: { speedBonus: number }) => void
  onCancel: () => void
}

export function QuizPage({ quiz, questions, mode = 'classic', timeLimitSeconds, onFinish, onCancel }: QuizPageProps) {
  const t = useT()
  const locale = useLocale()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<AnswersByQuestion>({})
  const [elapsed, setElapsed] = useState(0)
  const shuffledQuestions = useMemo(() => questions.map(withShuffledAnswers), [questions])
  const question = shuffledQuestions[current]
  const timeAttack = mode === 'timeAttack'
  const noMistake = mode === 'noMistake'
  const blitz = mode === 'blitz'
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

  // Blitz : chaque question a sa propre échéance (horloge murale, pas le compteur d'une seconde de `elapsed`, pour que
  // le temps par question soit exact). Une question sans réponse à l'échéance compte fausse ; `Infinity` = verrou une
  // fois la question quittée (clic tardif ou double clic sans effet).
  const [questionMs, setQuestionMs] = useState(BLITZ_SECONDS * 1000)
  const deadline = useRef(Infinity)
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed
  const [errors, setErrors] = useState(0)
  const [streak, setStreak] = useState(0) // bonnes réponses d'affilée
  // Score courant (points + bonus, en dixièmes), dernier gain affiché, bonus cumulé.
  const [scoreTenths, setScoreTenths] = useState(0)
  const [gain, setGain] = useState<{ key: number; tenths: number } | null>(null)
  const bonusTenths = useRef(0)
  const lastTick = useRef(-1) // dernière seconde « tic » jouée sur la question
  const advanceBlitz = (nextAnswers: AnswersByQuestion, wrong: boolean) => {
    deadline.current = Infinity
    if (wrong) { playWrong(); setStreak(0) } else {
      playCorrect()
      setStreak(streak + 1)
      if ((streak + 1) % 5 === 0) playStreak()
    }
    const nextErrors = errors + (wrong ? 1 : 0)
    // Fin : 3e erreur ou plus de question. Les questions jouées = celles jusqu'à la courante incluse (une question
    // sans réponse, temps écoulé, compte fausse).
    if (nextErrors >= BLITZ_MAX_ERRORS || atEnd) onFinish(nextAnswers, elapsedRef.current, shuffledQuestions.slice(0, current + 1), { speedBonus: bonusTenths.current / 10 })
    else { setErrors(nextErrors); setCurrent((value) => value + 1) }
  }
  const pickBlitz = (answerId: string) => {
    if (deadline.current === Infinity) return
    const next = { ...answers, [question.id]: [answerId] }
    setAnswers(next)
    const wrong = !isCorrect(question, [answerId])
    if (wrong) setGain(null)
    else {
      const bonus = speedBonusTenths(question.points, deadline.current - Date.now())
      bonusTenths.current += bonus
      setScoreTenths((value) => value + question.points * 10 + bonus)
      setGain({ key: Date.now(), tenths: question.points * 10 + bonus })
    }
    advanceBlitz(next, wrong)
  }
  useEffect(() => {
    if (!blitz) return
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined
    // Le chrono ne part qu'une fois les images des 4 cases chargées (un drapeau lent à venir ne doit pas coûter de temps) ;
    // en attendant, `Infinity` verrouille les clics. Les questions suivantes sont préchargées d'avance.
    deadline.current = Infinity
    setQuestionMs(BLITZ_SECONDS * 1000)
    void preloadAnswerImages(shuffledQuestions[current]).then(() => {
      if (cancelled) return
      deadline.current = Date.now() + BLITZ_SECONDS * 1000
      lastTick.current = -1
      interval = setInterval(() => {
        const left = deadline.current - Date.now()
        if (left <= 0) {
          if (deadline.current !== Infinity) advanceBlitz(answers, true)
          setQuestionMs(0)
        } else {
          setQuestionMs(left)
          const second = Math.ceil(left / 1000)
          if (second <= 3 && second !== lastTick.current) { lastTick.current = second; playTick() }
        }
      }, 100)
    })
    shuffledQuestions.slice(current + 1, current + 4).forEach((upcoming) => { void preloadAnswerImages(upcoming) })
    return () => { cancelled = true; if (interval) clearInterval(interval) }
  }, [blitz, current]) // `answers`/`atEnd` de ce rendu suffisent : ils ne changent qu'en quittant la question

  // Contre la montre à durée fixe : fin automatique dès que le temps est écoulé.
  useEffect(() => {
    if (timeAttack && timeLimitSeconds !== undefined && elapsed >= timeLimitSeconds) finish()
  }, [elapsed])

  if (!question) return <section className="empty"><h2>{t('quiz.noQuestion')}</h2><p>{t('quiz.noQuestionHint')}</p><button type="button" className="secondary" onClick={onCancel}>{t('common.back')}</button></section>
  const category = quiz.categories.find((item) => item.id === question.category)?.label ?? question.category
  const answeredCount = Object.keys(answers).length
  if (blitz && question.type === 'qcm') {
    const fraction = Math.max(0, Math.min(1, questionMs / (BLITZ_SECONDS * 1000)))
    return <section className="quiz-card blitz-card">
      <div className="question-meta">
        <span>⚡ {t('start.mode.blitz')}</span>
        <span key={errors} className={errors > 0 ? 'blitz-lives is-hit' : 'blitz-lives'} role="img" aria-label={t('quiz.blitzLives', { n: BLITZ_MAX_ERRORS - errors })}>{'❤️'.repeat(BLITZ_MAX_ERRORS - errors)}{'🖤'.repeat(errors)}</span>{streak >= 2 && <span key={streak} className="blitz-streak" role="img" aria-label={t('quiz.blitzStreak', { n: streak })}>🔥 {streak}</span>}<span role="img" aria-label={t('quiz.blitzScore', { n: formatNumber(scoreTenths / 10, locale, 1) })}>⭐ {formatNumber(scoreTenths / 10, locale, 1)}</span>{gain && <span key={gain.key} className="blitz-gain">+{formatNumber(gain.tenths / 10, locale, 1)}</span>}<span>{category}</span><span>{t('quiz.points', { n: question.points })}</span>
        <span>⏱ {formatDuration(Math.ceil(questionMs / 1000))}</span>
      </div>
      <div className="quiz-progress" role="timer" aria-label={t('quiz.blitzTimer')}>
        <div className={fraction <= 0.3 ? 'quiz-progress-fill is-urgent' : 'quiz-progress-fill'} style={{ width: `${fraction * 100}%`, background: rateColor(fraction * 100), transition: 'none' }} />
      </div>
      <p className="progress">{t('quiz.progress', { current: current + 1, total: shuffledQuestions.length })}</p>
      <div className="question-body" key={question.id}>
        {question.imageUrl && <QuestionImage src={question.imageUrl} alt={question.imageAlt} />}
        {question.shapeSvg && <QuestionShape svg={question.shapeSvg} alt={question.imageAlt} />}
        <h2>{question.question}</h2>
        <BlitzQuestion question={question} onPick={pickBlitz} />
      </div>
      <div className="quiz-actions">
        <button type="button" className="secondary" onClick={cancelQuiz}>{t('common.cancel')}</button>
      </div>
    </section>
  }
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
