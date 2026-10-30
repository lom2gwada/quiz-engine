import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n } from '../i18n/dataset'
import { useLocale, useT } from '../i18n'
import type { DataInfo, FicheDecorator, SpeechTemplates } from '../types/app'
import { DataInfoNote } from './DataInfoNote'
import { Fiche } from './Fiche'
import { buildSpeech, speechLocale } from '../utils/speechText'
import { FicheEditForm } from './FicheEditForm'
import { SpeakButton } from './SpeakButton'

interface FicheModalProps {
  row: Row
  schema: GenSchema
  decor?: FicheDecorator
  /** Phrases lues par le bouton « Écouter » ; absent : pas de bouton. */
  speech?: SpeechTemplates
  i18n?: DataI18n
  /** Admin sur un dataset éditable : affiche le bouton « Modifier ». */
  canEdit?: boolean
  updateRow?: (key: string, patch: Partial<Row>) => Promise<void>
  onRowUpdated?: (updatedRow: Row) => void
  /** Fiches voisines (valeurs FR canoniques) dans l'ordre courant ; absentes aux extrémités. Avec `onNavigate`, ajoute ← / →. */
  neighbors?: { prev?: string; next?: string }
  /** Date de mise à jour et sources des données, en pied de fiche. */
  dataInfo?: DataInfo
  onNavigate?: (canonical: string) => void
  onClose: () => void
}

/** Affiche une fiche dans une modale centrée (portail sur `<body>`) : Échap / clic hors panneau
 * / bouton × pour fermer. Admin sur un dataset éditable : bascule vers FicheEditForm. */
export function FicheModal({ row, schema, decor, speech, i18n, canEdit, updateRow, onRowUpdated, neighbors, dataInfo, onNavigate, onClose }: FicheModalProps) {
  const t = useT()
  const locale = useLocale()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const data = useMemo(() => makeDatasetI18n(i18n, locale), [i18n, locale])
  const name = data.value(row[schema.subjectColumn] ?? '')
  const canonical = row[schema.subjectColumn] ?? ''
  const prevName = neighbors?.prev ? data.value(neighbors.prev) : ''
  const nextName = neighbors?.next ? data.value(neighbors.next) : ''

  // Changer de fiche ramène en haut du panneau, et quitte le mode édition.
  useEffect(() => { panelRef.current?.scrollTo?.(0, 0); setEditing(false) }, [canonical])

  // ← / → : fiche précédente / suivante (sauf pendant la saisie).
  useEffect(() => {
    if (!onNavigate) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const target = event.target as HTMLElement | null
      if (editing || target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const to = event.key === 'ArrowLeft' ? neighbors?.prev : neighbors?.next
      if (to) { event.preventDefault(); onNavigate(to) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNavigate, neighbors, editing])

  const sentences = useMemo(() => buildSpeech(row, schema, i18n, locale, speech), [row, schema, i18n, locale, speech])

  // À la fermeture, le focus retourne là où il était (ex. « Suivante » après une correction) : le clavier reprend où il s'était arrêté.
  useEffect(() => {
    const opener = document.activeElement
    return () => { if (opener instanceof HTMLElement && opener.isConnected) opener.focus() }
  }, [])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="modal-panel fiche-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('fiche.modalLabel', { name })}
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label={t('fiche.close')}>×</button>
        {!editing && onNavigate && (prevName || nextName) && <nav className="fiche-nav" aria-label={t('fiche.navLabel')}>
          <button type="button" className="secondary" disabled={!prevName} onClick={() => neighbors?.prev && onNavigate(neighbors.prev)} aria-label={prevName ? t('fiche.prev', { name: prevName }) : undefined}>{prevName ? `← ${prevName}` : '←'}</button>
          <button type="button" className="secondary" disabled={!nextName} onClick={() => neighbors?.next && onNavigate(neighbors.next)} aria-label={nextName ? t('fiche.next', { name: nextName }) : undefined}>{nextName ? `${nextName} →` : '→'}</button>
        </nav>}
        {!editing && (canEdit && updateRow || (speech && sentences.length > 0)) && <div className="fiche-modal-actions">
          {speech && <SpeakButton sentences={sentences} locale={speechLocale(speech, locale)} />}
          {canEdit && updateRow && <button type="button" className="secondary fiche-edit-toggle" onClick={() => setEditing(true)}>✏️ {t('fiche.edit')}</button>}
        </div>}
        {editing
          ? <FicheEditForm row={row} schema={schema} save={updateRow!} onCancel={() => setEditing(false)} onSaved={(updatedRow) => { onRowUpdated?.(updatedRow); setEditing(false) }} />
          : <Fiche row={row} schema={schema} decor={decor} i18n={i18n} />}
        {!editing && <DataInfoNote info={dataInfo} />}
      </div>
    </div>,
    document.body,
  )
}
