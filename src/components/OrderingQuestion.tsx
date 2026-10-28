import { useEffect, useRef, useState } from 'react'
import type { OrderingQuestion as Question, UserAnswer } from '../types/quiz'
import { useT } from '../i18n'
import { playClick } from '../utils/sound'

export function OrderingQuestion({ question, answer, onChange }: { question: Question; answer?: UserAnswer; onChange: (value: string[]) => void }) {
  const t = useT()
  const order = Array.isArray(answer) && answer.length ? answer : question.content.items.map((item) => item.id)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  // Annonce pour les lecteurs d'écran après un déplacement (« Cérium : position 2 sur 4 »), et bouton à re-focaliser : le déplacement du
  // <li> dans le DOM fait perdre le focus au bouton qu'on vient d'utiliser.
  const [announcement, setAnnouncement] = useState('')
  const pendingFocus = useRef<{ id: string; direction: -1 | 1 } | null>(null)
  const labelOf = (id: string) => question.content.items.find((entry) => entry.id === id)?.label ?? ''

  // Sans ça, un ordre jamais touché (déjà le bon à l'affichage, ou on passe directement à la
  // question suivante) laisse `answer` à `undefined` : compté faux alors que l'écran montre le bon
  // ordre. `question-body` est remonté à chaque question (`key={question.id}` dans QuizPage), donc
  // un effet sans dépendances suffit — pas besoin de surveiller `question.id`.
  useEffect(() => {
    if (!Array.isArray(answer) || !answer.length) onChange(order)
  }, [])

  const move = (index: number, direction: -1 | 1) => {
    const next = [...order]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    playClick()
    pendingFocus.current = { id: order[index], direction }
    setAnnouncement(t('ordering.position', { name: labelOf(order[index]), position: target + 1, total: next.length }))
    onChange(next)
  }

  // Redonne le focus au bouton utilisé ; s'il est désactivé (l'élément est arrivé en haut ou en bas), à l'autre bouton de la ligne.
  useEffect(() => {
    const pending = pendingFocus.current
    if (!pending) return
    pendingFocus.current = null
    const row = itemRefs.current.get(pending.id)
    const preferred = row?.querySelector<HTMLButtonElement>(pending.direction === -1 ? 'button[data-move="up"]' : 'button[data-move="down"]')
    const other = row?.querySelector<HTMLButtonElement>(pending.direction === -1 ? 'button[data-move="down"]' : 'button[data-move="up"]')
    ;(preferred && !preferred.disabled ? preferred : other)?.focus()
  }, [order.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Glisser-déposer par pointer events (souris + tactile unifiés) : la poignée capture le pointeur et on
  // réordonne en direct pendant le déplacement, en trackant l'ordre courant nous-mêmes (pas via `order`,
  // qui ne se met à jour qu'au prochain rendu — trop tard pour les pointermove suivants du même geste).
  const startDrag = (index: number) => (event: React.PointerEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    let currentOrder = order
    let currentIndex = index
    setDragIndex(index)

    const onMove = (moveEvent: PointerEvent) => {
      const overIndex = currentOrder.findIndex((id) => {
        const rect = itemRefs.current.get(id)?.getBoundingClientRect()
        return rect && moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom
      })
      if (overIndex === -1 || overIndex === currentIndex) return
      const next = [...currentOrder]
      const [moved] = next.splice(currentIndex, 1)
      next.splice(overIndex, 0, moved)
      currentOrder = next
      currentIndex = overIndex
      setDragIndex(overIndex)
      onChange(next)
    }
    const onUp = () => {
      playClick()
      setDragIndex(null)
      setAnnouncement(t('ordering.position', { name: labelOf(currentOrder[currentIndex]), position: currentIndex + 1, total: currentOrder.length }))
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return <>
  <ol className="ordering-list">
    {order.map((id, index) => {
      const item = question.content.items.find((entry) => entry.id === id)!
      return <li key={id} ref={(el) => { if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id) }} className={dragIndex === index ? 'dragging' : ''}>
        <span className="ordering-handle" onPointerDown={startDrag(index)} aria-hidden="true">⠿</span>
        <span className="ordering-label">{item.label}</span>
        <span><button type="button" data-move="up" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t('ordering.upItem', { name: item.label })}>↑</button><button type="button" data-move="down" onClick={() => move(index, 1)} disabled={index === order.length - 1} aria-label={t('ordering.downItem', { name: item.label })}>↓</button></span>
      </li>
    })}
  </ol>
  <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
  </>
}
