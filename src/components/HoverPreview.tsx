import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FocusEvent, MouseEvent, ReactNode } from 'react'

interface HoverPreviewProps {
  /** Contenu affiché en petit, en flux. */
  trigger: ReactNode
  /** Contenu affiché en grand dans la bulle. */
  preview: ReactNode
  /** Si fourni, le trigger devient un lien (nouvel onglet). */
  href?: string
  label?: string
  className?: string
}

/** `trigger` inline ; au survol ou au focus clavier, `preview` (agrandi) apparaît dans une bulle
 * `position: fixed` (portail sur `<body>` → pas de souci d'imbrication), clampée au viewport et
 * refermée au scroll. Sert au tableau CSV et aux fiches (drapeau + silhouette). */
export function HoverPreview({ trigger, preview, href, label, className }: HoverPreviewProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const W = 236, H = 190
    const top = r.top - H - 8 < 8 ? r.bottom + 8 : r.top - H - 8
    const left = Math.max(8, Math.min(r.left + r.width / 2 - W / 2, window.innerWidth - W - 8))
    setPos({ top, left })
  }
  const hide = () => setPos(null)

  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [pos])

  const handlers = {
    className: className ? `hover-preview ${className}` : 'hover-preview',
    onMouseEnter: (event: MouseEvent<HTMLElement>) => show(event.currentTarget),
    onMouseLeave: hide,
    onFocus: (event: FocusEvent<HTMLElement>) => show(event.currentTarget),
    onBlur: hide,
  }

  const pop = pos && createPortal(
    <div className="hover-preview-pop" style={{ top: pos.top, left: pos.left }}>{preview}</div>,
    document.body,
  )

  return href
    ? <a {...handlers} href={href} target="_blank" rel="noreferrer" aria-label={label} onClick={(event) => event.stopPropagation()}>{trigger}{pop}</a>
    : <span {...handlers} tabIndex={0} role="img" aria-label={label}>{trigger}{pop}</span>
}
