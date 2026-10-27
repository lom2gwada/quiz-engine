import { describe, expect, it } from 'vitest'
import { clearIds, groupCategories, selectIds } from './categoryGroups'

const categories = ['capitale', 'population', 'monnaie', 'drapeau', 'carte'].map((id) => ({ id, label: id.toUpperCase() }))
const groups = [
  { id: 'geo', labels: { fr: 'Géographie', en: 'Geography' }, categories: ['capitale', 'inconnue'] },
  { id: 'eco', labels: { fr: 'Économie' }, categories: ['monnaie', 'population'] },
]

describe('groupCategories', () => {
  it('sans groupes : une seule liste à plat, sans intitulé', () => {
    expect(groupCategories(categories, undefined, 'fr')).toEqual([{ id: 'all', categories }])
    expect(groupCategories(categories, [], 'fr')).toHaveLength(1)
  })

  it('suit l’ordre des groupes et des catégories de l’appli, et ignore les catégories absentes du quiz', () => {
    const views = groupCategories(categories, groups, 'fr')
    expect(views.map((view) => view.id)).toEqual(['geo', 'eco', 'other'])
    expect(views[0].categories.map((category) => category.id)).toEqual(['capitale'])
    expect(views[1].categories.map((category) => category.id)).toEqual(['monnaie', 'population'])
  })

  it('range les catégories non citées dans un groupe « autres » : rien n’est perdu', () => {
    const other = groupCategories(categories, groups, 'fr')[2]
    expect(other).toMatchObject({ id: 'other', other: true })
    expect(other.categories.map((category) => category.id)).toEqual(['drapeau', 'carte'])
    expect(other.label).toBeUndefined()
  })

  it('traduit l’intitulé, avec repli sur le français puis sur l’identifiant', () => {
    expect(groupCategories(categories, groups, 'en')[0].label).toBe('Geography')
    expect(groupCategories(categories, groups, 'es')[0].label).toBe('Géographie')
    expect(groupCategories(categories, [{ id: 'x', labels: {}, categories: ['capitale'] }], 'fr')[0].label).toBe('x')
  })

  it('masque un groupe vide et ne met une catégorie que dans son premier groupe', () => {
    const views = groupCategories(categories, [
      { id: 'vide', labels: { fr: 'Vide' }, categories: ['nope'] },
      { id: 'a', labels: { fr: 'A' }, categories: ['capitale'] },
      { id: 'b', labels: { fr: 'B' }, categories: ['capitale', 'monnaie'] },
    ], 'fr')
    expect(views.map((view) => view.id)).toEqual(['a', 'b', 'other'])
    expect(views[1].categories.map((category) => category.id)).toEqual(['monnaie'])
  })
})

describe('selectIds / clearIds', () => {
  it('ajoute sans doublon et conserve l’ordre existant', () => {
    expect(selectIds(['b'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
  })

  it('retire seulement les identifiants demandés', () => {
    expect(clearIds(['a', 'b', 'c'], ['b', 'x'])).toEqual(['a', 'c'])
    expect(clearIds([], ['a'])).toEqual([])
  })
})
