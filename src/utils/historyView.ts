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
