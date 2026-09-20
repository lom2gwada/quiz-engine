import type { CategoryWeekHeatmap as Heatmap } from '../types/history'
import { useLocale, useT } from '../i18n'
import { heatColor } from '../utils/rateColor'

/** Réussite par catégorie (lignes) et par semaine (colonnes) : montre la progression dans le temps. */
export function CategoryWeekHeatmap({ heatmap, title, labelOf, note }: { heatmap: Heatmap; title: string; labelOf: (key: string) => string; note?: string }) {
  const t = useT()
  const locale = useLocale()
  const weekLabel = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })

  return <figure className="week-heatmap">
    <figcaption><h3 className="stats-group-title">{title}</h3></figcaption>
    <div className="week-heatmap-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">{t('history.heatmapCategoryColumn')}</span></th>
            {heatmap.weeks.map((week) => <th scope="col" key={week}>{weekLabel(week)}</th>)}
          </tr>
        </thead>
        <tbody>
          {heatmap.categories.map((category) => <tr key={category.key}>
            <th scope="row">{labelOf(category.key)}</th>
            {category.cells.map((cell, index) => {
              if (!cell || !cell.total) return <td key={heatmap.weeks[index]} className="week-heatmap-empty" aria-label={t('history.heatmapNoData')}>·</td>
              const rate = Math.round((cell.correct / cell.total) * 100)
              return <td key={heatmap.weeks[index]} style={{ background: heatColor(rate) }} title={t('history.heatmapCellTitle', { correct: cell.correct, total: cell.total })}>{rate}%</td>
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="week-heatmap-legend" aria-hidden="true"><span>0 %</span><div className="week-heatmap-legend-bar" /><span>100 %</span></div>
    {note && <p className="week-heatmap-note">{note}</p>}
  </figure>
}
