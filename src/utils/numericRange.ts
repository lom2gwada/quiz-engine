/** Valeur de départ d'un curseur d'estimation : le milieu de l'intervalle, ramené au multiple de `step` (à partir de `min`) le plus
 *  proche — c'est ce que le navigateur sélectionne réellement ; sans cet alignement, le libellé affiché et la valeur du curseur
 *  (donc la réponse soumise) divergent. Jamais au-delà du dernier cran atteignable avant `max`. */
export function initialNumericValue(min: number, max: number, step: number): number {
  if (!(step > 0) || max <= min) return min
  const decimals = Math.max(0, ...[min, step].map((n) => (String(n).split('.')[1] ?? '').length))
  const last = Math.floor((max - min) / step + 1e-9)
  const index = Math.min(last, Math.round((max - min) / 2 / step + 1e-9))
  return Number((min + index * step).toFixed(decimals))
}
