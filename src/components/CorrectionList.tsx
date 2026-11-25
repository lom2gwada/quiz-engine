import { useEffect, useId, useState } from 'react'
import type { DatasetMap } from '../types/app'
import type { AnswersByQuestion, Question } from '../types/quiz'
import { plural, useLocale, useT } from '../i18n'
import { correctAnswer, isCorrect, userAnswer } from '../utils/answerCheck'
import { QuestionImage } from './QuestionImage'
import { QuestionShape } from './QuestionShape'
import { ResultActions } from './ResultActions'
import { SpeakButton } from './SpeakButton'

/** Une question corrigée : `key` la distingue des autres. */
export interface CorrectionItem {
  key: string
  question: Question
  answer: AnswersByQuestion[string] | undefined
}

type Filter = 'all' | 'wrong' | 'right'

interface CorrectionListProps {
  items: CorrectionItem[]
  /** Carte / tableau de l'appli : rendu en correction des questions « Cliquez sur X » (bonne case + réponse donnée). */
  renderMap?: DatasetMap['render']
  /** Ouvre la fiche du sujet d'une question ; absent s'il n'y a pas de jeu de données (quiz JSON importé). */
  onViewFiche?: (subject: string) => void
  /** Question de groupe (classement, association) : ouvre les fiches de ses éléments, parcourables dans la modale. */
  onViewFiches?: (subjects: string[]) => void
  /** Les boutons de fin de partie, répétés sous la liste pour ne pas avoir à remonter tout en haut. */
  onRestartSame?: () => void
  onBackToSettings: () => void
}

const noop = () => {}

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** La correction d'une partie. Chaque question est une ligne repliable : les ratées s'ouvrent d'elles-mêmes, les réussies restent repliées.
 *  Au-dessus : un filtre (toutes, à revoir, réussies), « Tout déplier » et une grille de numéros, verts ou rouges, qui mène à la question.
 *  Sous la liste : les boutons de fin de partie et un retour en haut de page. Rien ici ne touche au score : seul l'affichage change. */
export function CorrectionList({ items, renderMap, onViewFiche, onViewFiches, onRestartSame, onBackToSettings }: CorrectionListProps) {
  const t = useT()
  const locale = useLocale()
  const prefix = useId()
  const [filter, setFilter] = useState<Filter>('all')
  // Ce que le joueur a ouvert ou fermé lui-même ; sans choix, une question est ouverte si elle est ratée.
  const [choice, setChoice] = useState<Record<string, boolean>>({})
  const [pendingScroll, setPendingScroll] = useState<string | null>(null)

  const rows = items.map((item, index) => ({ ...item, index, correct: isCorrect(item.question, item.answer), domId: `${prefix}-${index}` }))
  const isOpen = (row: (typeof rows)[number]) => choice[row.key] ?? !row.correct
  const wrongCount = rows.filter((row) => !row.correct).length
  const counts: Record<Filter, number> = { all: rows.length, wrong: wrongCount, right: rows.length - wrongCount }
  const visible = rows.filter((row) => filter === 'all' || (filter === 'wrong' ? !row.correct : row.correct))
  const allOpen = visible.length > 0 && visible.every(isOpen)

  // Après un clic sur un numéro : la carte est ouverte et affichée ; on la rejoint et on y place le focus.
  useEffect(() => {
    if (!pendingScroll) return
    const card = document.getElementById(pendingScroll)
    card?.scrollIntoView?.({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' })
    card?.querySelector<HTMLButtonElement>('.correction-toggle')?.focus({ preventScroll: true })
    setPendingScroll(null)
  }, [pendingScroll])

  const goTo = (row: (typeof rows)[number]) => {
    if (filter !== 'all' && !(filter === 'wrong' ? !row.correct : row.correct)) setFilter('all')
    setChoice((previous) => ({ ...previous, [row.key]: true }))
    setPendingScroll(row.domId)
  }
  const toggleAll = () => setChoice((previous) => ({ ...previous, ...Object.fromEntries(visible.map((row) => [row.key, !allOpen])) }))
  const toTop = () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })

  const pills: { id: Filter; label: string }[] = [
    { id: 'all', label: t('result.filterAll', { n: counts.all }) },
    { id: 'wrong', label: t('result.filterWrong', { n: counts.wrong }) },
    { id: 'right', label: t('result.filterRight', { n: counts.right }) },
  ]

  return <>
    <h3 className="stats-group-title">{t(plural('result.correctionsTitle', rows.length, locale), { n: rows.length })}</h3>
    <div className="correction-toolbar" role="group" aria-label={t('result.filterLabel')}>
      {pills.map((pill) => <button key={pill.id} type="button" className="correction-pill" aria-pressed={filter === pill.id} disabled={counts[pill.id] === 0 && pill.id !== 'all'} onClick={() => setFilter(pill.id)}>{pill.label}</button>)}
      {visible.length > 0 && <button type="button" className="text-toggle" onClick={toggleAll}>{allOpen ? t('result.collapseAll') : t('result.expandAll')}</button>}
    </div>
    <nav aria-label={t('result.questionsNav')}>
      <ol className="correction-grid">
        {rows.map((row) => <li key={row.key}>
          <button type="button" className={`correction-chip ${row.correct ? 'correct' : 'incorrect'}`} aria-label={t(row.correct ? 'result.chipRight' : 'result.chipWrong', { n: row.index + 1 })} onClick={() => goTo(row)}>{row.index + 1}</button>
        </li>)}
      </ol>
    </nav>
    <div className="corrections">{visible.map((row) => {
      const open = isOpen(row)
      const { question, answer, correct } = row
      return <article id={row.domId} className={`correction correction-card ${correct ? 'correct' : 'incorrect'}`} key={row.key}>
        <h3 className="correction-heading">
          <button type="button" className="correction-toggle" aria-expanded={open} aria-controls={`${row.domId}-body`} onClick={() => setChoice((previous) => ({ ...previous, [row.key]: !open }))}>
            <span className="correction-verdict" aria-hidden="true">{correct ? '✓' : '✗'}</span>
            <span className="sr-only">{correct ? t('result.correct') : t('result.incorrect')} — </span>
            <span className="correction-number">{row.index + 1}.</span>
            <span className="correction-title">{question.question}</span>
            <span className="correction-chevron" aria-hidden="true">▾</span>
          </button>
        </h3>
        {open && <div className="correction-body" id={`${row.domId}-body`}>
          {question.imageUrl && <QuestionImage src={question.imageUrl} alt={question.imageAlt} />}
          {question.shapeSvg && <QuestionShape svg={question.shapeSvg} alt={question.imageAlt} />}
          {question.type === 'map' && renderMap && <div className="correction-map">{renderMap({ target: question.content.target, selected: typeof answer === 'string' ? answer : undefined, onPick: noop, review: true })}</div>}
          {!correct && <p><strong>{t('result.yourAnswer')}</strong> {userAnswer(question, answer, t)}</p>}
          {!correct && <p><strong>{t('result.goodAnswer')}</strong> {correctAnswer(question, t)}</p>}
          <p>{question.explanation}</p>
          {question.explanation && <div className="correction-speak"><SpeakButton sentences={[question.explanation]} locale={locale} label={t('result.speakExplanation')} /></div>}
          {question.subject && onViewFiche && (
            <button type="button" className="link-button" onClick={() => onViewFiche(question.subject!)}>
              {t('result.viewFiche', { name: question.subjectLabel ?? question.subject })}
            </button>
          )}
          {!question.subject && question.subjects?.length && onViewFiches && (
            <button type="button" className="link-button" onClick={() => onViewFiches(question.subjects!)}>
              {t('result.viewFiches', { n: question.subjects.length })}
            </button>
          )}
        </div>}
      </article>
    })}</div>
    <div className="correction-footer">
      <ResultActions onRestartSame={onRestartSame} onBackToSettings={onBackToSettings} />
      <button type="button" className="text-toggle" onClick={toTop}>↑ {t('result.backToTop')}</button>
    </div>
  </>
}
