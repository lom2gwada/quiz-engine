import { describe, expect, it } from 'vitest'
import { movingAverage, sortCategoryPoints, weakCategories } from './historyView'

describe('movingAverage', () => {
  it('commence dès la première valeur avec une fenêtre plus courte', () => {
    expect(movingAverage([10, 20, 30], 10)).toEqual([10, 15, 20])
  })

  it('ne garde que les `window` dernières valeurs une fois la fenêtre pleine', () => {
    expect(movingAverage([0, 0, 100, 100], 2)).toEqual([0, 0, 50, 100])
  })

  it('série vide, fenêtre invalide', () => {
    expect(movingAverage([], 10)).toEqual([])
    expect(movingAverage([4, 8], 0)).toEqual([4, 8])
  })
})

describe('sortCategoryPoints', () => {
  const points = [{ label: 'Économie', percent: 80 }, { label: 'Capitale', percent: 40 }, { label: 'Zone', percent: 40 }, { label: 'Étendue', percent: 95 }]

  it('points faibles d’abord, ex æquo par ordre alphabétique', () => {
    expect(sortCategoryPoints(points, 'weakest', 'fr').map((p) => p.label)).toEqual(['Capitale', 'Zone', 'Économie', 'Étendue'])
  })

  it('alphabétique selon la langue (É après D, avant F)', () => {
    expect(sortCategoryPoints(points, 'alpha', 'fr').map((p) => p.label)).toEqual(['Capitale', 'Économie', 'Étendue', 'Zone'])
  })

  it('ne modifie pas la liste reçue', () => {
    const copy = [...points]
    sortCategoryPoints(points, 'weakest', 'fr')
    expect(points).toEqual(copy)
  })
})

describe('weakCategories', () => {
  const bucket = (correct: number, total: number) => ({ correct, total })
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

  it('garde les 5 taux les plus bas, du plus faible au moins faible', () => {
    const buckets = { a: bucket(9, 10), b: bucket(3, 10), c: bucket(5, 10), d: bucket(7, 10), e: bucket(1, 10), f: bucket(6, 10), g: bucket(8, 10) }
    expect(weakCategories(buckets, ids).map((c) => c.id)).toEqual(['e', 'b', 'c', 'f', 'd'])
  })

  it('ignore les catégories trop peu jouées', () => {
    expect(weakCategories({ a: bucket(0, 9), b: bucket(5, 10) }, ids).map((c) => c.id)).toEqual(['b'])
  })

  it('ignore les catégories absentes du quiz (anciens libellés, autre tirage)', () => {
    expect(weakCategories({ Histoire: bucket(1, 20), a: bucket(5, 10) }, ids).map((c) => c.id)).toEqual(['a'])
  })

  it('une catégorie réussie à 100 % n’est pas un point faible', () => {
    expect(weakCategories({ a: bucket(12, 12) }, ids)).toEqual([])
  })

  it('à taux égal, la mieux mesurée d’abord ; pourcentage arrondi', () => {
    const result = weakCategories({ a: bucket(5, 10), b: bucket(10, 20), c: bucket(1, 12) }, ids)
    expect(result).toEqual([{ id: 'c', percent: 8, total: 12 }, { id: 'b', percent: 50, total: 20 }, { id: 'a', percent: 50, total: 10 }])
  })

  it('rien à travailler sans historique', () => {
    expect(weakCategories({}, ids)).toEqual([])
  })
})
