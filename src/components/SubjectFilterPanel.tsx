import { useMemo } from 'react'
import type { Dataset } from '../types/app'
import { makeDatasetI18n } from '../i18n/dataset'
import { useLocale, useT } from '../i18n'
import { subjectChips, toggleSubjects } from '../utils/subjectFilter'
import { playClick } from '../utils/sound'

const pick = (labels: Partial<Record<string, string>>, locale: string): string => labels[locale] ?? labels.fr ?? Object.values(labels)[0] ?? ''

/** Filtre « Territoires » de l'accueil : des raccourcis par valeur d'une colonne (groupe géographique, pays de rattachement…) qui
 *  (dé)sélectionnent leurs sujets, et un choix un par un. Aucun sujet retenu = tous. Le nombre de questions disponibles est
 *  affiché plus bas par l'accueil, comme pour les catégories. */
export function SubjectFilterPanel({ dataset, selected, onChange }: { dataset: Dataset; selected: string[]; onChange: (subjects: string[]) => void }) {
  const t = useT()
  const locale = useLocale()
  const filter = dataset.subjectFilter
  const data = useMemo(() => makeDatasetI18n(dataset.i18n, locale), [dataset.i18n, locale])
  const { subjectColumn } = dataset.schema
  const subjects = useMemo(() => Array.from(new Set(dataset.rows.map((row) => row[subjectColumn] ?? '').filter(Boolean))), [dataset.rows, subjectColumn])
  const sorted = useMemo(() => [...subjects].sort((a, b) => data.value(a).localeCompare(data.value(b), locale)), [subjects, data, locale])
  const chips = useMemo(() => (filter?.by ?? []).map((by) => ({ ...by, chips: subjectChips(dataset.rows, dataset.schema, by.column) })), [filter, dataset.rows, dataset.schema])
  if (!filter) return null

  const change = (next: string[]) => { playClick(); onChange(next) }
  const status = selected.length === 0 || selected.length === subjects.length ? t('subjectFilter.all') : t('subjectFilter.some', { n: selected.length, total: subjects.length })
  const title = pick(filter.labels, locale)

  return <fieldset className="subject-filter">
    <legend>{title}</legend>
    {chips.map((by) => <div key={by.column} className="subject-filter-group" role="group" aria-label={pick(by.labels, locale)}>
      <span className="subject-filter-group-title">{pick(by.labels, locale)}</span>
      <div className="subject-filter-chips">
        {by.chips.map((chip) => {
          const active = chip.subjects.every((subject) => selected.includes(subject))
          return <button key={chip.value} type="button" className={active ? 'mode-chip is-active' : 'mode-chip'} aria-pressed={active} onClick={() => change(toggleSubjects(selected, chip.subjects))}>
            {data.value(chip.value)} <span className="subject-filter-count">{chip.subjects.length}</span>
          </button>
        })}
      </div>
    </div>)}
    <details className="subject-filter-list">
      <summary>{t('subjectFilter.pick')}</summary>
      <div className="category-actions">
        <button type="button" className="link-button" onClick={() => change([])}>{t('subjectFilter.reset')}</button>
      </div>
      <div className="category-checkboxes">
        {sorted.map((subject) => <label key={subject} className="category-checkbox">
          <input type="checkbox" checked={selected.includes(subject)} onChange={() => change(selected.includes(subject) ? selected.filter((item) => item !== subject) : [...selected, subject])} />
          {data.value(subject)}
        </label>)}
      </div>
    </details>
    <p className="category-hint" role="status">{status}</p>
  </fieldset>
}
