import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useT } from '../i18n'

/** Demande de confirmation en ligne, à la place d'une boîte du navigateur : dit ce qui va être remplacé et ce qui est conservé.
 *  Le focus va sur « confirmer » à l'ouverture ; Échap annule. */
export function ConfirmBar({ title, children, confirmLabel, onConfirm, onCancel }: { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const t = useT()
  const confirmRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => { confirmRef.current?.focus() }, [])
  const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onCancel() } }
  return <div className="confirm-bar" role="alertdialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} onKeyDown={onKeyDown}>
    <p className="confirm-title" id={`${id}-title`}>{title}</p>
    <div className="confirm-body" id={`${id}-body`}>{children}</div>
    <div className="confirm-actions">
      <button type="button" ref={confirmRef} onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" className="secondary" onClick={onCancel}>{t('common.cancel')}</button>
    </div>
  </div>
}
