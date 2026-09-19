interface PieSlice {
  label: string
  value: number
  color: string
}

const RADIUS = 15.9155 // circonférence ≈ 100, un point de dasharray = un pourcent
const START_OFFSET = 25 // décale le point de départ du tracé du "3h" (défaut SVG) au "12h"

export function PieChart({ title, data }: { title: string; data: PieSlice[] }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0)
  let cumulative = 0

  return <figure className="pie-chart">
    <svg viewBox="0 0 36 36" role="img" aria-label={title}>
      {total === 0
        ? <circle cx="18" cy="18" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="4" />
        : data.map((slice) => {
          const percent = (slice.value / total) * 100
          const dashoffset = START_OFFSET - cumulative
          cumulative += percent
          return <circle key={slice.label} cx="18" cy="18" r={RADIUS} fill="none" stroke={slice.color} strokeWidth="4"
            strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={dashoffset} />
        })}
    </svg>
    <figcaption>
      <h3>{title}</h3>
      <ul>
        {data.map((slice) => <li key={slice.label}>
          <span className="swatch" style={{ background: slice.color }} />
          {slice.label} — {slice.value} ({total ? Math.round((slice.value / total) * 100) : 0}%)
        </li>)}
      </ul>
    </figcaption>
  </figure>
}
