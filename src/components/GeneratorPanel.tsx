import { useMemo, useState } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { MessageKey } from '../i18n'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n } from '../i18n/dataset'
import { getGrammar } from '../i18n/grammar'
import { useLocale, useT } from '../i18n'
import { inferSchema, randomSeed } from '../utils/quizGenerator'
import { playClick } from '../utils/sound'

interface GeneratorPanelProps {
  rows: Row[]
  schema: GenSchema
  i18n?: DataI18n
  onGenerate: (schema: GenSchema, seed: string) => void
  error: string
}

function typeBadges(spec: GenSchema['columns'][string]): MessageKey[] {
  if (spec.isImage) {
    const badges: MessageKey[] = ['gen.badge.image']
    if (spec.unique) badges.push('gen.badge.unique')
    return badges
  }
  const badges: MessageKey[] = [spec.kind === 'number' ? 'gen.badge.number' : 'gen.badge.text']
  if (spec.isYear) badges.push('gen.badge.year')
  if (spec.multivalueSeparator) badges.push('gen.badge.multi')
  if (spec.unique) badges.push('gen.badge.unique')
  return badges
}

export function GeneratorPanel({ rows, schema, i18n, onGenerate, error }: GeneratorPanelProps) {
  const t = useT()
  const locale = useLocale()
  const data = useMemo(() => makeDatasetI18n(i18n, locale), [i18n, locale])
  const cap = getGrammar(locale).cap
  const [draft, setDraft] = useState<GenSchema>(schema)
  const [seed, setSeed] = useState(randomSeed())
  const headers = rows.length ? Object.keys(rows[0]) : []
  // Libellé lisible d'une colonne (repli sur la clé CSV pour sujet / article).
  const colLabel = (col: string): string => {
    const label = draft.columns[col]?.label
    return label ? cap(data.label(label)) : col
  }

  const patchColumn = (col: string, patch: Partial<GenSchema['columns'][string]>) =>
    setDraft((current) => ({ ...current, columns: { ...current.columns, [col]: { ...current.columns[col], ...patch } } }))

  const changeSubject = (subjectColumn: string) => {
    // Rebâtit le schéma autour de la nouvelle colonne sujet ; les réglages par colonne sont réinitialisés.
    setDraft((current) => ({ ...inferSchema(rows, { subjectColumn }), noun: current.noun, title: current.title }))
  }

  const includedCount = Object.values(draft.columns).filter((c) => c.include).length

  return (
    <section className="generator-panel">
      <h3 className="stats-group-title">{t('gen.title', { n: rows.length })}</h3>

      <div className="generator-fields">
        <label>{t('gen.subjectColumn')}
          <select value={draft.subjectColumn} onChange={(event) => changeSubject(event.target.value)}>
            {headers.map((h) => <option key={h} value={h}>{colLabel(h)}</option>)}
          </select>
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
            <span className="generator-column-badges">{typeBadges(spec).map((badge) => <span key={badge} className="generator-badge">{t(badge)}</span>)}</span>
            {spec.kind === 'string' && !spec.isImage && spec.include && (
              <label className="generator-sep">{t('gen.multivalueSep')}
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

      <div className="generator-actions">
        <label>{t('gen.seed')}
          <input value={seed} onChange={(event) => setSeed(event.target.value)} />
        </label>
        <button type="button" onClick={() => { playClick(); setSeed(randomSeed()) }} className="secondary">{t('gen.randomSeed')}</button>
        <button type="button" onClick={() => { playClick(); onGenerate(draft, seed) }} disabled={!includedCount}>
          {t('gen.generate')}
        </button>
      </div>
      {!includedCount && <p className="alert" role="alert">{t('gen.needColumn')}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  )
}
