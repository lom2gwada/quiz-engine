import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MatchingQuestion as Question, UserAnswer } from '../types/quiz'
import { playClick } from '../utils/sound'
import { shuffle } from '../utils/shuffle'

const LINE_COLORS = ['#38bdf8', '#a78bfa', '#fbbf24', '#f472b6', '#34d399', '#fb923c']

function parsePairs(answer?: UserAnswer): Record<string, string> {
  const pairs: Record<string, string> = {}
  if (Array.isArray(answer)) {
    answer.forEach((token) => {
      const [left, right] = token.split(':')
      if (left && right) pairs[left] = right
    })
  }
  return pairs
}

interface Line { x1: number; y1: number; x2: number; y2: number; color: string }

export function MatchingQuestion({ question, answer, onChange }: { question: Question; answer?: UserAnswer; onChange: (value: string[]) => void }) {
  const pairs = parsePairs(answer)
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const rightRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [lines, setLines] = useState<Line[]>([])
  const shuffledLeft = useMemo(() => shuffle(question.content.left), [question])
  const shuffledRight = useMemo(() => shuffle(question.content.right), [question])

  const colorFor = (leftId: string) => LINE_COLORS[question.content.left.findIndex((item) => item.id === leftId) % LINE_COLORS.length]

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const next: Line[] = []
    Object.entries(pairs).forEach(([leftId, rightId]) => {
      const leftEl = leftRefs.current[leftId]
      const rightEl = rightRefs.current[rightId]
      if (!leftEl || !rightEl) return
      const leftRect = leftEl.getBoundingClientRect()
      const rightRect = rightEl.getBoundingClientRect()
      next.push({
        x1: leftRect.right - rect.left, y1: leftRect.top + leftRect.height / 2 - rect.top,
        x2: rightRect.left - rect.left, y2: rightRect.top + rightRect.height / 2 - rect.top,
        color: colorFor(leftId),
      })
    })
    setLines(next)
  }, [answer])

  const emit = (next: Record<string, string>) => onChange(Object.entries(next).map(([left, right]) => `${left}:${right}`))

  const toggleLeft = (id: string) => {
    playClick()
    if (pairs[id]) {
      const next = { ...pairs }
      delete next[id]
      emit(next)
      setSelectedLeft(null)
      return
    }
    setSelectedLeft((current) => (current === id ? null : id))
  }

  const chooseRight = (rightId: string) => {
    const owner = Object.keys(pairs).find((left) => pairs[left] === rightId)
    if (owner) {
      playClick()
      const next = { ...pairs }
      delete next[owner]
      emit(next)
      return
    }
    if (!selectedLeft) return
    playClick()
    emit({ ...pairs, [selectedLeft]: rightId })
    setSelectedLeft(null)
  }

  return <div className="matching" ref={containerRef}>
    <svg className="matching-lines" aria-hidden="true">
      {lines.map((line, index) => <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color} strokeWidth={2} />)}
    </svg>
    <div className="matching-col">
      {shuffledLeft.map((item) => <button type="button" key={item.id}
        ref={(el) => { leftRefs.current[item.id] = el }}
        className={`matching-item${selectedLeft === item.id ? ' selected' : ''}${pairs[item.id] ? ' paired' : ''}`}
        style={pairs[item.id] ? { borderColor: colorFor(item.id) } : undefined}
        onClick={() => toggleLeft(item.id)}>{item.label}</button>)}
    </div>
    <div className="matching-col">
      {shuffledRight.map((item) => {
        const owner = Object.keys(pairs).find((left) => pairs[left] === item.id)
        return <button type="button" key={item.id}
          ref={(el) => { rightRefs.current[item.id] = el }}
          className={`matching-item${owner ? ' paired' : ''}`}
          style={owner ? { borderColor: colorFor(owner) } : undefined}
          onClick={() => chooseRight(item.id)}>{item.label}</button>
      })}
    </div>
  </div>
}
