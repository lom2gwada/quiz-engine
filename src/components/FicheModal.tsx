import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n } from '../i18n/dataset'
import { useLocale, useT } from '../i18n'
import type { FicheDecorator } from '../types/app'
import { Fiche } from './Fiche'
import { FicheEditForm } from './FicheEditForm'

interface FicheModalProps {
  row: Row
  schema: GenSchema
  decor?: FicheDecorator
  i18n?: DataI18n
  /** Admin sur un dataset éditable : affiche le bouton « Modifier ». */
  canEdit?: boolean
  updateRow?: (key: string, patch: Partial<Row>) => Promise<void>
  onRowUpdated?: (updatedRow: Row) => void
  onClose: () => void
}

/** Affiche une fiche dans une modale centrée (portail sur `<body>`) : Échap / clic hors panneau
 * / bouton × pour fermer. Admin sur un dataset éditable : bascule vers FicheEditForm. */
export function FicheModal({ row, schema, decor, i18n, canEdit, updateRow, onRowUpdated, onClose }: FicheModalProps) {
  const t = useT()
  const locale = useLocale()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState(false)
  const name = useMemo(() => makeDatasetI18n(i18n, locale).value(row[schema.subjectColumn] ?? ''), [i18n, locale, row, schema.subjectColumn])

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
        className="modal-panel fiche-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('fiche.modalLabel', { name })}
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label={t('fiche.close')}>×</button>
        {canEdit && updateRow && !editing && <button type="button" className="secondary fiche-edit-toggle" onClick={() => setEditing(true)}>✏️ {t('fiche.edit')}</button>}
        {editing
          ? <FicheEditForm row={row} schema={schema} save={updateRow!} onCancel={() => setEditing(false)} onSaved={(updatedRow) => { onRowUpdated?.(updatedRow); setEditing(false) }} />
          : <Fiche row={row} schema={schema} decor={decor} i18n={i18n} />}
      </div>
    </div>,
    document.body,
  )
}
