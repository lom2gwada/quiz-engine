import { useEffect, useMemo, useState } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { Question } from '../types/quiz'
import type { MessageKey } from '../i18n'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n } from '../i18n/dataset'
import { getGrammar } from '../i18n/grammar'
import { useLocale, useT } from '../i18n'
import { formatNumber } from '../utils/number'
import { inferSchema, randomSeed } from '../utils/quizGenerator'
import { sampleQuestions } from '../utils/quizSample'
import { playClick } from '../utils/sound'
import { ConfirmBar } from './ConfirmBar'
import { typeLabel } from './QuizPage'
import { correctAnswer } from './ResultPage'

/** Nombre de questions montrées dans l'aperçu. */
const PREVIEW_COUNT = 6

interface GeneratorPanelProps {
  rows: Row[]
  schema: GenSchema
  i18n?: DataI18n
  onGenerate: (schema: GenSchema, seed: string) => void
  onPreview: (schema: GenSchema, seed: string) => { questions: Question[]; error: string }
  /** Générer enregistre aussi ces réglages comme défaut partagé (admin) : la confirmation le dit. */
  sharedDefault: boolean
  /** Taille du quiz actuel, pour situer l'aperçu. */
  totalQuestions: number
  error: string
}

/** Étiquette de type d'une colonne, avec son explication en infobulle. */
function typeBadges(spec: GenSchema['columns'][string]): { label: MessageKey; help: MessageKey }[] {
  const unique = { label: 'gen.badge.unique', help: 'gen.badge.unique.help' } as const
  if (spec.isImage) {
    const badges: { label: MessageKey; help: MessageKey }[] = [{ label: 'gen.badge.image', help: 'gen.badge.image.help' }]
    if (spec.unique) badges.push(unique)
    return badges
  }
  const badges: { label: MessageKey; help: MessageKey }[] = [spec.kind === 'number' ? { label: 'gen.badge.number', help: 'gen.badge.number.help' } : { label: 'gen.badge.text', help: 'gen.badge.text.help' }]
  if (spec.isYear) badges.push({ label: 'gen.badge.year', help: 'gen.badge.year.help' })
  if (spec.multivalueSeparator) badges.push({ label: 'gen.badge.multi', help: 'gen.badge.multi.help' })
  if (spec.unique) badges.push(unique)
  return badges
}

/** Nom lisible d'une colonne sans libellé (sujet, article) : « pays_de_rattachement » → « Pays de rattachement ». */
const prettyColumn = (col: string) => { const words = col.replace(/_/g, ' '); return words.charAt(0).toUpperCase() + words.slice(1) }

export function GeneratorPanel({ rows, schema, i18n, onGenerate, onPreview, sharedDefault, totalQuestions, error }: GeneratorPanelProps) {
  const t = useT()
  const locale = useLocale()
  const data = useMemo(() => makeDatasetI18n(i18n, locale), [i18n, locale])
  const cap = getGrammar(locale).cap
  const [draft, setDraft] = useState<GenSchema>(schema)
  const [seed, setSeed] = useState(randomSeed())
  const [confirming, setConfirming] = useState(false)
  const [preview, setPreview] = useState<{ questions: Question[]; error: string } | null>(null)
  const headers = rows.length ? Object.keys(rows[0]) : []
  // Libellé lisible d'une colonne (repli sur le nom de la colonne CSV pour sujet / article).
  const colLabel = (col: string): string => {
    const label = draft.columns[col]?.label
    return label ? cap(data.label(label)) : prettyColumn(col)
  }

  // L'aperçu et la demande de confirmation décrivent les réglages tels qu'ils étaient : on les retire dès qu'on y touche.
  useEffect(() => { setPreview(null); setConfirming(false) }, [draft, seed])

  const patchColumn = (col: string, patch: Partial<GenSchema['columns'][string]>) =>
    setDraft((current) => ({ ...current, columns: { ...current.columns, [col]: { ...current.columns[col], ...patch } } }))

  const changeSubject = (subjectColumn: string) => {
    // Rebâtit le schéma autour de la nouvelle colonne sujet ; les réglages par colonne sont réinitialisés.
    setDraft((current) => ({ ...inferSchema(rows, { subjectColumn }), noun: current.noun, title: current.title }))
  }

  const includedCount = Object.values(draft.columns).filter((c) => c.include).length
  const titleChanged = draft.title.trim() !== schema.title.trim()
  const sample = preview ? sampleQuestions(preview.questions, PREVIEW_COUNT) : []

  return (
    <section className="generator-panel">
      <h3 className="stats-group-title">{t('gen.title', { n: rows.length })}</h3>

      <div className="generator-fields">
        <label>{t('gen.subjectColumn')}
          <select value={draft.subjectColumn} onChange={(event) => changeSubject(event.target.value)} aria-describedby="gen-subject-help">
            {headers.map((h) => <option key={h} value={h}>{colLabel(h)}</option>)}
          </select>
          <small id="gen-subject-help" className="generator-help">{t('gen.subjectHelp')}</small>
        </label>
        <label>{t('gen.itemNoun')}
          <input value={draft.noun} onChange={(event) => setDraft((c) => ({ ...c, noun: event.target.value }))} placeholder={t('gen.itemNounPlaceholder')} />
        </label>
        <label>{t('gen.quizTitle')}
          <input value={draft.title} onChange={(event) => setDraft((c) => ({ ...c, title: event.target.value }))} />
        </label>
      </div>

      <ul className="generator-columns">
        {Object.entries(draft.columns).map(([col, spec]) => (
          <li key={col} className={spec.include ? '' : 'is-excluded'}>
            <label className="generator-column-toggle">
              <input type="checkbox" checked={spec.include} onChange={(event) => patchColumn(col, { include: event.target.checked })} />
              <span className="generator-column-name" title={col}>{colLabel(col)}</span>
            </label>
            <span className="generator-column-badges">{typeBadges(spec).map((badge) => <span key={badge.label} className="generator-badge" title={t(badge.help)}>{t(badge.label)}</span>)}</span>
            {spec.kind === 'string' && !spec.isImage && spec.include && (
              <label className="generator-sep" title={t('gen.multivalueSepHelp')}>{t('gen.multivalueSep')}
                <input
                  value={spec.multivalueSeparator ?? ''}
                  maxLength={1}
                  placeholder="|"
                  onChange={(event) => patchColumn(col, { multivalueSeparator: event.target.value || undefined })}
                />
              </label>
            )}
          </li>
        ))}
      </ul>

      <details className="generator-advanced">
        <summary>{t('gen.advanced')}</summary>
        <div className="generator-actions">
          <label>{t('gen.seed')}
            <input value={seed} onChange={(event) => setSeed(event.target.value)} aria-describedby="gen-seed-help" />
          </label>
          <button type="button" onClick={() => { playClick(); setSeed(randomSeed()) }} className="secondary">{t('gen.randomSeed')}</button>
        </div>
        <p id="gen-seed-help" className="generator-help">{t('gen.seedHelp')}</p>
      </details>

      <div className="generator-actions">
        <button type="button" className="secondary" onClick={() => { playClick(); setPreview(onPreview(draft, seed)) }} disabled={!includedCount}>{t('gen.preview')}</button>
        <button type="button" onClick={() => { playClick(); setConfirming(true) }} disabled={!includedCount}>
          {t('gen.generate')}
        </button>
      </div>
      {confirming && <ConfirmBar title={t('confirm.generate.title')} confirmLabel={t('confirm.generate.confirm')} onConfirm={() => { setConfirming(false); onGenerate(draft, seed) }} onCancel={() => setConfirming(false)}>
        <p>{t(sharedDefault ? 'confirm.generate.bodyShared' : 'confirm.generate.body')}</p>
        {titleChanged && <p>{t('confirm.generate.titleChanged')}</p>}
      </ConfirmBar>}
      {preview && !preview.error && sample.length > 0 && <div className="generator-preview">
        <h4>{t('gen.previewTitle', { n: sample.length, total: formatNumber(preview.questions.length, locale) })}</h4>
        <p className="generator-help">{t('gen.previewNote', { current: formatNumber(totalQuestions, locale) })}</p>
        <ol>
          {sample.map((question) => <li key={question.id}>
            <span className="generator-badge">{typeLabel(question.type, t)}</span>
            <span className="generator-preview-question">{question.question}</span>
            <span className="generator-preview-answer">{t('gen.previewAnswer', { answer: correctAnswer(question, t) })}</span>
          </li>)}
        </ol>
      </div>}
      {preview?.error && <p className="alert" role="alert">{preview.error}</p>}
      {!includedCount && <p className="alert" role="alert">{t('gen.needColumn')}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  )
}
