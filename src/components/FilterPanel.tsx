import type { Category, Difficulty } from '../types/quiz'
import { useT } from '../i18n'
import { playClick } from '../utils/sound'

interface FilterPanelProps {
  categories: Category[]
  selectedCategories: string[]
  difficulty: Difficulty | ''
  onCategoryToggle: (categoryId: string) => void
  onDifficultyChange: (value: Difficulty | '') => void
}

export function FilterPanel({ categories, selectedCategories, difficulty, onCategoryToggle, onDifficultyChange }: FilterPanelProps) {
  const t = useT()
  const n = selectedCategories.length
  return <section className="filter-panel" aria-label={t('filter.aria')}>
    <fieldset className="category-filter">
      <legend>{t('filter.categories')}</legend>
      <div className="category-checkboxes">
        {categories.map((item) => <label key={item.id} className="category-checkbox">
          <input type="checkbox" checked={selectedCategories.includes(item.id)} onChange={() => { playClick(); onCategoryToggle(item.id) }} />
          {item.label}
        </label>)}
      </div>
      <p className="category-hint">{n ? t(n === 1 ? 'filter.selected.one' : 'filter.selected.other', { n }) : t('filter.allCategories')}</p>
    </fieldset>
    <label>{t('filter.difficulty')}
      <select value={difficulty} onChange={(event) => { playClick(); onDifficultyChange(event.target.value as Difficulty | '') }}>
        <option value="">{t('filter.allDifficulties')}</option>
        <option value="easy">{t('difficulty.easy')}</option>
        <option value="medium">{t('difficulty.medium')}</option>
        <option value="hard">{t('difficulty.hard')}</option>
      </select>
    </label>
  </section>
}
