import { useState } from 'react'
import type { CategoryGroup } from '../types/app'
import type { Category, Difficulty } from '../types/quiz'
import { plural, useLocale, useT } from '../i18n'
import { clearIds, groupCategories, selectIds } from '../utils/categoryGroups'
import { playClick } from '../utils/sound'

interface FilterPanelProps {
  categories: Category[]
  /** Regroupement défini par l'appli (`Dataset.categoryGroups`) ; absent : une seule liste. */
  groups?: CategoryGroup[]
  selectedCategories: string[]
  difficulty: Difficulty | ''
  onSelectedChange: (categoryIds: string[]) => void
  onDifficultyChange: (value: Difficulty | '') => void
}

/** Sur téléphone les filtres sont repliés (29 catégories = plusieurs écrans avant « Jouer ») : la ligne de résumé dit ce qui est
 *  réglé ; sur grand écran ils restent dépliés. */
const startsOpen = () => typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 700px)').matches

/** Catégories (par groupes, avec « Tout / Aucun » par groupe et au total) et difficulté. Aucune case cochée = toutes les
 *  catégories : c'est dit en toutes lettres sous la liste. */
export function FilterPanel({ categories, groups, selectedCategories, difficulty, onSelectedChange, onDifficultyChange }: FilterPanelProps) {
  const t = useT()
  const locale = useLocale()
  const [open, setOpen] = useState(startsOpen)
  const views = groupCategories(categories, groups, locale)
  const n = selectedCategories.length
  const status = n === 0 ? t('filter.noneChecked') : n === categories.length ? t('filter.allCategories') : t(plural('filter.selected', n), { n, total: categories.length })
  const categoriesSummary = n === 0 || n === categories.length ? t('filter.allCategories') : t(plural('filter.selected', n), { n, total: categories.length })
  const difficultySummary = difficulty ? t(`difficulty.${difficulty}`) : t('filter.allDifficulties')
  const change = (next: string[]) => { playClick(); onSelectedChange(next) }
  const allIds = categories.map((category) => category.id)

  return <details className="filter-panel filter-details" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="filter-summary">
      <span className="filter-summary-text">{categoriesSummary} · {difficultySummary}</span>
      <span className="filter-summary-edit">{open ? t('filter.collapse') : t('filter.edit')}</span>
    </summary>
    <fieldset className="category-filter">
      <legend>{t('filter.categories')}</legend>
      <div className="category-actions">
        <button type="button" className="link-button" aria-label={t('filter.selectAllAria')} onClick={() => change(allIds)}>{t('filter.selectAll')}</button>
        <button type="button" className="link-button" aria-label={t('filter.selectNoneAria')} onClick={() => change([])}>{t('filter.selectNone')}</button>
      </div>
      {views.map((view) => {
        const label = view.other ? t('filter.group.other') : view.label
        const ids = view.categories.map((category) => category.id)
        return <div key={view.id} className="category-group" role="group" aria-label={label}>
          {label && <div className="category-group-head">
            <span className="category-group-title">{label}</span>
            <span className="category-actions">
              <button type="button" className="link-button" aria-label={t('filter.selectAllIn', { group: label })} onClick={() => change(selectIds(selectedCategories, ids))}>{t('filter.selectAll')}</button>
              <button type="button" className="link-button" aria-label={t('filter.selectNoneIn', { group: label })} onClick={() => change(clearIds(selectedCategories, ids))}>{t('filter.selectNone')}</button>
            </span>
          </div>}
          <div className="category-checkboxes">
            {view.categories.map((item) => <label key={item.id} className="category-checkbox">
              <input type="checkbox" checked={selectedCategories.includes(item.id)} onChange={() => change(selectedCategories.includes(item.id) ? clearIds(selectedCategories, [item.id]) : selectIds(selectedCategories, [item.id]))} />
              {item.label}
            </label>)}
          </div>
        </div>
      })}
      <p className="category-hint" role="status">{status}</p>
    </fieldset>
    <label>{t('filter.difficulty')}
      <select value={difficulty} onChange={(event) => { playClick(); onDifficultyChange(event.target.value as Difficulty | '') }}>
        <option value="">{t('filter.allDifficulties')}</option>
        <option value="easy">{t('difficulty.easy')}</option>
        <option value="medium">{t('difficulty.medium')}</option>
        <option value="hard">{t('difficulty.hard')}</option>
      </select>
    </label>
  </details>
}
