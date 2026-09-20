/** Du rouge (0 %) au vert (100 %) en passant par l'ambre — teinte HSL directe, lisible en thème clair comme sombre.
 *  Partagée par les deux heat maps de l'historique pour qu'une même couleur veuille dire la même réussite. */
export const rateColor = (rate: number): string => `hsl(${Math.round(rate * 1.2)} 62% 38%)`

/** Couleur d'une case de heat map : dégradé `--heat-low` → `--heat-mid` → `--heat-high` défini par chaque thème (styles.css). */
export const heatColor = (rate: number): string => {
  const clamped = Math.min(100, Math.max(0, rate))
  return clamped <= 50
    ? `color-mix(in oklch, var(--heat-mid) ${clamped * 2}%, var(--heat-low))`
    : `color-mix(in oklch, var(--heat-high) ${(clamped - 50) * 2}%, var(--heat-mid))`
}
