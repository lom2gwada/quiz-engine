import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n } from '../i18n/dataset'
import { useLocale, useT } from '../i18n'
import { storageKey } from '../config'
import { playClick } from '../utils/sound'
import type { FicheDecorator } from '../types/app'
import { Fiche } from './Fiche'

interface AtlasPageProps {
  rows: Row[]
  schema: GenSchema
  decor?: FicheDecorator
  /** Boutons d'accès aux vues propres au jeu de données (carte…), à gauche de « Retour ». */
  actions?: ReactNode
  i18n?: DataI18n
  onBack: () => void
  /** Ouvre la fiche d'une entité en modale (clic sur une carte). Reçoit la valeur FR canonique. */
  onOpenFiche: (name: string) => void
}

type AtlasView = 'compact' | 'detailed'

const readView = (): AtlasView => {
  try { return localStorage.getItem(storageKey('atlas-view')) === 'detailed' ? 'detailed' : 'compact' } catch { return 'compact' }
}
const writeView = (view: AtlasView) => {
  try { localStorage.setItem(storageKey('atlas-view'), view) } catch { /* non bloquant */ }
}

/** Grille de fiches, une par entité, dans l'ordre du tri choisi. Filtre + tri génériques
 * depuis le schéma. Deux vues, mémorisées : compacte (image, nom et une valeur clé — la page tient en quelques écrans) ou
 * détaillée (toutes les fiches complètes). Dans les deux cas, cliquer une carte ouvre la fiche en modale. */
export function AtlasPage({ rows, schema, decor, actions, i18n, onBack, onOpenFiche }: AtlasPageProps) {
  const t = useT()
  const locale = useLocale()
  const data = useMemo(() => makeDatasetI18n(i18n, locale), [i18n, locale])
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name') // 'name' ou une colonne nombre
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [view, setView] = useState<AtlasView>(readView)
  const chooseView = (next: AtlasView) => { playClick(); setView(next); writeView(next) }
  const { subjectColumn, articleColumn, columns } = schema
  const imageCol = Object.keys(columns).find((c) => columns[c].include && columns[c].isImage)
  // Valeur clé de la vue compacte : la première colonne de texte (la capitale, le symbole…).
  const summaryCol = Object.keys(columns).find((c) => columns[c].include && !columns[c].isImage && columns[c].kind !== 'number' && c !== subjectColumn && c !== articleColumn)

  const numCols = useMemo(
    () => Object.entries(columns).filter(([c, s]) => s.include && s.kind === 'number' && c !== subjectColumn),
    [columns, subjectColumn],
  )

  const changeSort = (key: string) => {
    setSortKey(key)
    setSortDir(key === 'name' || columns[key]?.isYear ? 'asc' : 'desc')
  }
  const numOf = (row: Row, col: string): number | null => {
    const raw = (row[col] ?? '').trim()
    if (!raw) return null // Number('') === 0 : à écarter explicitement
    const n = Number(raw.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const nameOf = (r: Row) => data.value(r[subjectColumn] ?? '')
  const q = query.trim().toLowerCase()
  const filtered = q
    ? rows.filter((r) => {
        const raw = r[subjectColumn] ?? ''
        return raw.toLowerCase().includes(q) || data.value(raw).toLowerCase().includes(q)
      })
    : rows
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = nameOf(a).localeCompare(nameOf(b), locale)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const na = numOf(a, sortKey), nb = numOf(b, sortKey)
      if (na === null && nb === null) return 0
      if (na === null) return 1 // valeurs manquantes toujours en fin
      if (nb === null) return -1
      return sortDir === 'asc' ? na - nb : nb - na
    })
  }, [filtered, sortKey, sortDir, subjectColumn])

  return (
    <section className="atlas-page">
      <div className="stats-header">
        <h2>{t('atlas.title')}</h2>
        <div className="header-actions">
          {actions}
          <button type="button" className="secondary" onClick={onBack}>{t('common.back')}</button>
        </div>
      </div>
      <div className="atlas-controls">
        <input
          className="atlas-search"
          type="search"
          placeholder={t('atlas.filterPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('atlas.filterAria')}
        />
        <label className="atlas-sort">
          {t('atlas.sortBy')}
          <select value={sortKey} onChange={(event) => changeSort(event.target.value)}>
            <option value="name">{t('atlas.sortName')}</option>
            {numCols.map(([col, spec]) => <option key={col} value={col}>{data.label(spec.label)}</option>)}
          </select>
        </label>
        <button
          type="button"
          className="secondary atlas-dir"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          aria-label={sortDir === 'asc' ? t('atlas.sortAsc') : t('atlas.sortDesc')}
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      <div className="atlas-view-toggle mode-toggle" role="group" aria-label={t('atlas.viewLabel')}>
        <button type="button" className={view === 'compact' ? 'mode-chip is-active' : 'mode-chip'} aria-pressed={view === 'compact'} onClick={() => chooseView('compact')}>{t('atlas.viewCompact')}</button>
        <button type="button" className={view === 'detailed' ? 'mode-chip is-active' : 'mode-chip'} aria-pressed={view === 'detailed'} onClick={() => chooseView('detailed')}>{t('atlas.viewDetailed')}</button>
      </div>
      {view === 'compact' && <div className="atlas-grid is-compact">
        {sorted.map((row) => {
          const canonical = row[subjectColumn] ?? ''
          const name = nameOf(row)
          const image = imageCol && /^https?:\/\//.test((row[imageCol] ?? '').trim()) ? row[imageCol].trim() : null
          const { lead } = decor?.(row, { name, canonical }) ?? {}
          const summary = summaryCol ? (row[summaryCol] ?? '').trim() : ''
          return <button type="button" className="atlas-tile" key={canonical} onClick={() => { playClick(); onOpenFiche(canonical) }}>
            <span className="atlas-tile-media">
              {image ? <img className="fiche-flag" src={image} alt={imageCol ? t('fiche.imageAlt', { label: data.label(columns[imageCol].label).replace(/^./, (c) => c.toUpperCase()), of_name: data.ofSubject(canonical, articleColumn ? row[articleColumn] : undefined) }) : ''} loading="lazy" /> : lead}
            </span>
            <span className="atlas-tile-name">{name}</span>
            {summaryCol && summary && <span className="atlas-tile-sub">{data.label(columns[summaryCol].label).replace(/^./, (c) => c.toUpperCase())} : {data.value(summary)}</span>}
          </button>
        })}
      </div>}
      {view === 'detailed' && <div className="atlas-grid">
        {sorted.map((row) => {
          const canonical = row[subjectColumn] ?? '' // valeur FR : clé d'ouverture de la fiche
          return (
            <div
              className="fiche-card"
              key={canonical}
              role="button"
              tabIndex={0}
              onClick={() => onOpenFiche(canonical)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenFiche(canonical) }
              }}
            >
              <Fiche row={row} schema={schema} decor={decor} i18n={i18n} />
            </div>
          )
        })}
      </div>}
      {!sorted.length && <p className="atlas-empty">{t('atlas.empty', { query })}</p>}
    </section>
  )
}
