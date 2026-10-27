import type { StatBucket } from '../types/history'

/** Moyenne glissante « de queue » : pour chaque valeur, la moyenne d'elle-même et des `window - 1` précédentes (fenêtre
 *  plus courte tout au début de la série, pour que la courbe commence dès la première partie). */
export function movingAverage(values: number[], window: number): number[] {
  const size = Math.max(1, Math.floor(window))
  const result: number[] = []
  let sum = 0
  values.forEach((value, index) => {
    sum += value
    if (index >= size) sum -= values[index - size]
    result.push(sum / Math.min(index + 1, size))
  })
  return result
}

export type CategorySort = 'weakest' | 'alpha'

/** Catégories triées : points faibles d'abord (taux de réussite croissant, ex æquo par ordre alphabétique) ou
 *  alphabétique. Ne modifie pas la liste reçue. */
export function sortCategoryPoints<P extends { label: string; percent: number }>(points: P[], sort: CategorySort, locale: string): P[] {
  const alpha = (a: P, b: P) => a.label.localeCompare(b.label, locale)
  return [...points].sort(sort === 'alpha' ? alpha : (a, b) => a.percent - b.percent || alpha(a, b))
}

/** Nombre minimal de questions jouées dans une catégorie pour qu'on juge son taux de réussite (en dessous, 1 raté sur 2 questions
 *  ferait passer une catégorie pour « faible »), et nombre maximal de catégories retenues pour l'entraînement ciblé. */
export const WEAK_MIN_QUESTIONS = 10
export const WEAK_MAX_CATEGORIES = 5

export interface WeakCategory {
  id: string
  percent: number
  total: number
}

/** Les catégories à travailler : au plus `WEAK_MAX_CATEGORIES`, au taux de réussite le plus bas, parmi celles qui existent dans
 *  le quiz (`knownIds`) et où au moins `WEAK_MIN_QUESTIONS` questions ont été jouées. Une catégorie réussie à 100 % n'est pas
 *  un point faible. À taux égal, celle sur laquelle on a le plus joué passe d'abord (la mesure est plus fiable). */
export function weakCategories(buckets: Record<string, StatBucket>, knownIds: string[]): WeakCategory[] {
  const known = new Set(knownIds)
  return Object.entries(buckets)
    .filter(([id, bucket]) => known.has(id) && bucket.total >= WEAK_MIN_QUESTIONS && bucket.correct < bucket.total)
    .map(([id, bucket]) => ({ id, ratio: bucket.correct / bucket.total, percent: Math.round((bucket.correct / bucket.total) * 100), total: bucket.total }))
    .sort((a, b) => a.ratio - b.ratio || b.total - a.total || a.id.localeCompare(b.id))
    .slice(0, WEAK_MAX_CATEGORIES)
    .map(({ id, percent, total }) => ({ id, percent, total }))
}
