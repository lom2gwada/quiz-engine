import { useT } from '../i18n'
import { movingAverage } from '../utils/historyView'

interface ScorePoint {
  label: string
  score: number
}

/** Fenêtre de la moyenne glissante, en parties. */
export const SCORE_AVERAGE_WINDOW = 10

const WIDTH = 100
const HEIGHT = 100
const GRID = [100, 50, 0]

/** Courbe des scores dans l'ordre chronologique : axe des ordonnées (0 / 50 / 100 %), score de chaque partie en trait fin et
 *  moyenne glissante en trait épais — c'est elle qui montre la tendance quand il y a des dizaines de parties. */
export function ScoreChart({ points }: { points: ScorePoint[] }) {
  const t = useT()
  if (points.length < 2) return null

  const stepX = WIDTH / (points.length - 1)
  const y = (score: number) => HEIGHT - (Math.max(0, Math.min(100, score)) / 100) * HEIGHT
  const line = (values: number[]) => values.map((value, index) => `${index * stepX},${y(value)}`).join(' ')
  const scores = points.map((point) => point.score)
  const average = points.length >= 3 ? movingAverage(scores, SCORE_AVERAGE_WINDOW) : null

  return <figure className="score-chart">
    <div className="score-chart-plot">
      <div className="score-chart-yaxis" aria-hidden="true">{GRID.map((value) => <span key={value}>{value}%</span>)}</div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={t('scoreChart.aria')}>
        {GRID.map((value) => <line key={value} className="score-chart-grid" x1={0} x2={WIDTH} y1={y(value)} y2={y(value)} />)}
        <polygon className="score-chart-area" points={`0,${HEIGHT} ${line(scores)} ${WIDTH},${HEIGHT}`} />
        <polyline className="score-chart-line" points={line(scores)} />
        {average && <polyline className="score-chart-average" points={line(average)} />}
      </svg>
    </div>
    <div className="score-chart-labels"><span>{points[0].label}</span><span>{points[points.length - 1].label}</span></div>
    <figcaption className="score-chart-legend">
      <span className="score-chart-key score-chart-key-line">{t('scoreChart.legendScore')}</span>
      {average && <span className="score-chart-key score-chart-key-average">{t('scoreChart.legendAverage', { n: SCORE_AVERAGE_WINDOW })}</span>}
    </figcaption>
  </figure>
}
