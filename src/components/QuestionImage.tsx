import { useState } from 'react'

/** Les images sont hotlinkées (pas hébergées dans le repo) : si l'URL casse un jour, on masque
 * proprement plutôt que de laisser l'icône d'image cassée du navigateur. */
export function QuestionImage({ src, alt }: { src: string; alt?: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return null
  return <img className="question-image" src={src} alt={alt ?? ''} loading="lazy" onError={() => setBroken(true)} />
}
