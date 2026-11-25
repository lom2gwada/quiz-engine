// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Question } from '../types/quiz'
import { CorrectionList, type CorrectionItem } from './CorrectionList'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const qcm = (id: string, prompt: string, overrides: Partial<Question> = {}): Question => ({
  id, type: 'qcm', category: 'general', difficulty: 'easy', question: prompt, tags: [], explanation: `Explication de ${id}.`, points: 1,
  content: { multiple: false, answers: [{ id: 'a', label: 'Alpha', isCorrect: true }, { id: 'b', label: 'Beta', isCorrect: false }] },
  ...overrides,
} as Question)

/** Cinq questions : les numéros 2 et 4 sont ratées, les autres réussies. */
const questions = [1, 2, 3, 4, 5].map((n) => qcm(`q${n}`, `Énoncé ${n} ?`))
const items: CorrectionItem[] = questions.map((question) => ({ key: question.id, question, answer: ['b', 'a'] }))
const wrongIds = new Set(['q2', 'q4'])
const withAnswers: CorrectionItem[] = items.map((item) => ({ ...item, answer: wrongIds.has(item.key) ? ['b'] : ['a'] }))

let container: HTMLDivElement
let root: Root

const mount = (props: Partial<Parameters<typeof CorrectionList>[0]> = {}) => {
  act(() => { root.render(createElement(CorrectionList, { items: withAnswers, onBackToSettings: vi.fn(), ...props })) })
}
const toggles = () => Array.from(container.querySelectorAll<HTMLButtonElement>('.correction-toggle'))
const button = (label: string | RegExp) => Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((b) => (typeof label === 'string' ? b.textContent?.includes(label) : label.test(b.textContent ?? '')))!
const click = (element: HTMLElement) => act(() => { element.click() })

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('CorrectionList', () => {
  it('ouvre d\'office les questions ratées et replie les réussies', () => {
    mount()
    expect(toggles().map((toggle) => toggle.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'false', 'true', 'false'])
    expect(container.textContent).toContain('Explication de q2.')
    expect(container.textContent).not.toContain('Explication de q1.')
  })

  it('le filtre « À revoir » ne garde que les ratées, avec les effectifs dans les puces', () => {
    mount()
    expect(button('Toutes (5)')).toBeTruthy()
    expect(button('À revoir (2)')).toBeTruthy()
    expect(button('Réussies (3)')).toBeTruthy()
    click(button('À revoir (2)'))
    expect(toggles()).toHaveLength(2)
    expect(container.textContent).toContain('Énoncé 2 ?')
    expect(container.textContent).not.toContain('Énoncé 1 ?')
  })

  it('un clic sur un numéro ouvre la question réussie correspondante et y place le focus', () => {
    mount()
    click(container.querySelectorAll<HTMLButtonElement>('.correction-chip')[0])
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(toggles()[0])
  })

  it('un clic sur un numéro quitte le filtre qui cacherait la question', () => {
    mount()
    click(button('À revoir (2)'))
    click(container.querySelectorAll<HTMLButtonElement>('.correction-chip')[0])
    expect(toggles()).toHaveLength(5)
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true')
  })

  it('« Tout déplier » ouvre tout, puis « Tout replier » referme tout', () => {
    mount()
    click(button('Tout déplier'))
    expect(toggles().every((toggle) => toggle.getAttribute('aria-expanded') === 'true')).toBe(true)
    click(button('Tout replier'))
    expect(toggles().every((toggle) => toggle.getAttribute('aria-expanded') === 'false')).toBe(true)
  })

  it('répète les boutons de fin de partie sous la liste', () => {
    const onRestartSame = vi.fn()
    const onBackToSettings = vi.fn()
    mount({ onRestartSame, onBackToSettings })
    const footer = container.querySelector('.correction-footer')!
    click(Array.from(footer.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Rejouer'))!)
    click(Array.from(footer.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Retour aux paramètres'))!)
    expect(onRestartSame).toHaveBeenCalledTimes(1)
    expect(onBackToSettings).toHaveBeenCalledTimes(1)
  })

  it('propose la fiche du sujet d\'une question ouverte', () => {
    const onViewFiche = vi.fn()
    const subject = qcm('q9', 'Énoncé 9 ?', { subject: 'Cuba', subjectLabel: 'Cuba' })
    mount({ items: [{ key: 'q9', question: subject, answer: ['b'] }], onViewFiche })
    click(button('Voir la fiche'))
    expect(onViewFiche).toHaveBeenCalledWith('Cuba')
  })
})
