import { describe, expect, it } from 'vitest'
import type { Question } from '../types/quiz'
import { inferSchema, parseCsv } from './quizGenerator'
import { matchesSubjects, subjectChips, toggleSubjects } from './subjectFilter'

const q = (extra: Partial<Question>) => ({ id: 'x', ...extra }) as unknown as Question

describe('matchesSubjects', () => {
  const selected = new Set(['Cuba', 'Haïti'])

  it('sélection vide : tout passe', () => {
    expect(matchesSubjects(q({ subject: 'Aruba' }), new Set())).toBe(true)
  })

  it('question sur un sujet : il doit être retenu', () => {
    expect(matchesSubjects(q({ subject: 'Cuba' }), selected)).toBe(true)
    expect(matchesSubjects(q({ subject: 'Aruba' }), selected)).toBe(false)
  })

  it('question de groupe : tous ses sujets doivent être retenus', () => {
    expect(matchesSubjects(q({ subjects: ['Cuba', 'Haïti'] }), selected)).toBe(true)
    expect(matchesSubjects(q({ subjects: ['Cuba', 'Aruba'] }), selected)).toBe(false)
  })

  it('question sans sujet : conservée', () => {
    expect(matchesSubjects(q({}), selected)).toBe(true)
  })
})

describe('subjectChips / toggleSubjects', () => {
  const rows = parseCsv(['pays;groupe;rattachement;langues', 'Cuba;Grandes;;espagnol', 'Haïti;Grandes;;français', 'Martinique;Petites;France;français|créole', 'Guadeloupe;Petites;France;français|créole', 'Aruba;Petites;Pays-Bas;néerlandais'].join('\n'))
  const schema = inferSchema(rows)

  it('regroupe les sujets par valeur, plus nombreuses d’abord, sans les cases vides', () => {
    expect(subjectChips(rows, schema, 'groupe')).toEqual([
      { value: 'Petites', subjects: ['Martinique', 'Guadeloupe', 'Aruba'] },
      { value: 'Grandes', subjects: ['Cuba', 'Haïti'] },
    ])
    expect(subjectChips(rows, schema, 'rattachement').map((c) => c.value)).toEqual(['France', 'Pays-Bas'])
  })

  it('une colonne multivaleur place un sujet sous chacune de ses valeurs', () => {
    const multi = { ...schema, columns: { ...schema.columns, langues: { ...schema.columns.langues, multivalueSeparator: '|' } } }
    const chips = subjectChips(rows, multi, 'langues')
    expect(chips.find((c) => c.value === 'français')?.subjects).toEqual(['Haïti', 'Martinique', 'Guadeloupe'])
    expect(chips.find((c) => c.value === 'créole')?.subjects).toEqual(['Martinique', 'Guadeloupe'])
  })

  it('toggleSubjects ajoute tout le raccourci, ou le retire s’il est entièrement retenu', () => {
    expect(toggleSubjects([], ['Cuba', 'Haïti'])).toEqual(['Cuba', 'Haïti'])
    expect(toggleSubjects(['Cuba'], ['Cuba', 'Haïti'])).toEqual(['Cuba', 'Haïti'])
    expect(toggleSubjects(['Cuba', 'Haïti', 'Aruba'], ['Cuba', 'Haïti'])).toEqual(['Aruba'])
  })
})
