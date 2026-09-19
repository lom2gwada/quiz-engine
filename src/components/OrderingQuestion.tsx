import { useRef, useState } from 'react'
import type { OrderingQuestion as Question, UserAnswer } from '../types/quiz'
import { useT } from '../i18n'
import { playClick } from '../utils/sound'

export function OrderingQuestion({ question, answer, onChange }: { question: Question; answer?: UserAnswer; onChange: (value: string[]) => void }) {
  const t = useT()
  const order = Array.isArray(answer) && answer.length ? answer : question.content.items.map((item) => item.id)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())

  const move = (index: number, direction: -1 | 1) => {
    const next = [...order]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    playClick()
    onChange(next)
  }

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
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return <ol className="ordering-list">
    {order.map((id, index) => {
      const item = question.content.items.find((entry) => entry.id === id)!
      return <li key={id} ref={(el) => { if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id) }} className={dragIndex === index ? 'dragging' : ''}>
        <span className="ordering-handle" onPointerDown={startDrag(index)} aria-hidden="true">⠿</span>
        <span className="ordering-label">{item.label}</span>
        <span><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t('ordering.up')}>↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1} aria-label={t('ordering.down')}>↓</button></span>
      </li>
    })}
  </ol>
}
