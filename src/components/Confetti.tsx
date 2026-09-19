import { useMemo } from 'react'

const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#f472b6']

export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2.2 + Math.random() * 1.4,
    color: COLORS[index % COLORS.length],
    rotate: Math.round(Math.random() * 360),
  })), [count])

  return <div className="confetti" aria-hidden="true">
    {pieces.map((piece) => <span key={piece.id} className="confetti-piece" style={{
      left: `${piece.left}%`,
      background: piece.color,
      animationDelay: `${piece.delay}s`,
      animationDuration: `${piece.duration}s`,
      transform: `rotate(${piece.rotate}deg)`,
    }} />)}
  </div>
}
