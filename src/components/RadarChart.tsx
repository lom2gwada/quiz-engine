interface RadarChartProps {
  points: { label: string; percent: number }[]
  ariaLabel: string
}

const CX = 50
const CY = 50
const MAX_R = 32
const RINGS = [0.25, 0.5, 0.75, 1]

/** Point sur l'axe `index` (parmi `count`), à la fraction `fraction` du rayon max — 12h = premier
 *  axe, sens horaire, comme une horloge/boussole. */
function axisPoint(index: number, count: number, fraction: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
  return [CX + Math.cos(angle) * MAX_R * fraction, CY + Math.sin(angle) * MAX_R * fraction]
}

/** Radar à N axes (taux de réussite en %) — utilisé pour « par type » et « par difficulté »
 *  (peu de valeurs, contrairement à « par catégorie » qui reste en grille de camemberts). */
export function RadarChart({ points, ariaLabel }: RadarChartProps) {
  if (points.length < 3) return null
  const n = points.length

  const dataPolygon = points.map((p, i) => axisPoint(i, n, Math.max(0, Math.min(100, p.percent)) / 100).join(',')).join(' ')

  return <figure className="radar-chart">
    <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel}>
      {RINGS.map((fraction) => (
        <polygon key={fraction} className="radar-chart-grid" points={points.map((_, i) => axisPoint(i, n, fraction).join(',')).join(' ')} />
      ))}
      {points.map((_, i) => {
        const [x, y] = axisPoint(i, n, 1)
        return <line key={i} className="radar-chart-axis" x1={CX} y1={CY} x2={x} y2={y} />
      })}
      <polygon className="radar-chart-area" points={dataPolygon} />
      <polygon className="radar-chart-line" points={dataPolygon} />
      {points.map((p, i) => {
        const [x, y] = axisPoint(i, n, Math.max(0, Math.min(100, p.percent)) / 100)
        return <circle key={`pt-${i}`} className="radar-chart-point" cx={x} cy={y} r="1.6" />
      })}
      {points.map((p, i) => {
        const [x, y] = axisPoint(i, n, 1.28)
        const cos = Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n)
        const sin = Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n)
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'
        const dy = sin > 0.5 ? '0.8em' : sin < -0.5 ? '-0.2em' : '0.3em'
        return <text key={`lbl-${i}`} className="radar-chart-label" x={x} y={y} dy={dy} textAnchor={anchor}>{p.label}</text>
      })}
    </svg>
  </figure>
}
