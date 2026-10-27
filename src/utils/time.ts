export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Durée cumulée lisible : « 45 s », « 12 min 05 s », « 5 h 03 min » (là où `formatDuration` afficherait 303:12). */
export function formatLongDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')} min`
  if (minutes > 0) return seconds ? `${minutes} min ${String(seconds).padStart(2, '0')} s` : `${minutes} min`
  return `${seconds} s`
}
