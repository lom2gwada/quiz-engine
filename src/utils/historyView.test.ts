import { describe, expect, it } from 'vitest'
import { movingAverage, sortCategoryPoints } from './historyView'

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
