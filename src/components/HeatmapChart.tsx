interface HeatmapChartProps {
  points: { key: string; label: string; percent: number }[]
}

/** Grille de tuiles, une par clé (ex. catégorie), teinte allant de --error (faible) à --success
 *  (fort) — contrairement au radar, scale à n'importe quel nombre de colonnes sans découpage à
 *  décider (utilisé pour « par catégorie », qui peut avoir beaucoup plus de valeurs que
 *  type/difficulté). Le pourcentage reste affiché en texte : la couleur seule serait imprécise. */
export function HeatmapChart({ points }: HeatmapChartProps) {
  if (!points.length) return null

  return <div className="heatmap-chart">
    {points.map((p) => {
      const percent = Math.max(0, Math.min(100, p.percent))
      return <div
        key={p.key}
        className="heatmap-tile"
        style={{ background: `color-mix(in srgb, var(--error) ${100 - percent}%, var(--success) ${percent}%)` }}
      >
        <span className="heatmap-tile-label">{p.label}</span>
        <span className="heatmap-tile-value">{percent}%</span>
      </div>
    })}
  </div>
}
