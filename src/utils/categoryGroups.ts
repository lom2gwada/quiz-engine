import type { CategoryGroup } from '../types/app'
import type { Category } from '../types/quiz'
import type { Locale } from '../i18n/locale'
import { DEFAULT_LOCALE } from '../i18n/locale'

/** Un groupe de catégories prêt à afficher. `label` absent : pas d'intitulé (liste à plat) ; `other` : les catégories que
 *  l'appli n'a rangées dans aucun groupe (colonne ajoutée depuis, CSV importé…), intitulé fourni par le moteur. */
export interface CategoryGroupView {
  id: string
  label?: string
  other?: boolean
  categories: Category[]
}

/** Répartit les catégories d'un quiz selon les groupes de l'appli (`Dataset.categoryGroups`). L'ordre des groupes et celui
 *  des catégories dans un groupe sont ceux de l'appli ; un groupe vide (catégories absentes du quiz) n'est pas affiché ; une
 *  catégorie jamais citée n'est jamais perdue : elle tombe dans un groupe « autres ». Sans groupes : une seule liste à plat. */
export function groupCategories(categories: Category[], groups: CategoryGroup[] | undefined, locale: Locale): CategoryGroupView[] {
  if (!groups?.length) return [{ id: 'all', categories }]
  const byId = new Map(categories.map((category) => [category.id, category]))
  const placed = new Set<string>()
  const views: CategoryGroupView[] = []
  for (const group of groups) {
    const members = group.categories.flatMap((id) => {
      const category = byId.get(id)
      if (!category || placed.has(id)) return []
      placed.add(id)
      return [category]
    })
    if (members.length) views.push({ id: group.id, label: group.labels[locale] ?? group.labels[DEFAULT_LOCALE] ?? group.id, categories: members })
  }
  const rest = categories.filter((category) => !placed.has(category.id))
  if (rest.length) views.push({ id: 'other', other: true, categories: rest })
  return views
}

/** Ajoute `ids` à la sélection (sans doublon, l'ordre existant est conservé). */
export const selectIds = (selected: string[], ids: string[]): string[] => [...selected, ...ids.filter((id) => !selected.includes(id))]

/** Retire `ids` de la sélection. */
export const clearIds = (selected: string[], ids: string[]): string[] => selected.filter((id) => !ids.includes(id))
