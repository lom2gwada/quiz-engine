import type { Grammar } from './index'

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

const startsWithVowel = (s: string): boolean => /^[aeiouyàâäéèêëîïôöûüh]/i.test(s)

/** Contraction française de « de » avec l'article de tête du sujet. Repris tel quel de
 * l'ancien `dePhrase()` de quizGenerator.ts. */
function of(name: string, article?: string): string {
  const art = (article ?? '').trim().toLowerCase()
  if (art === 'les') return `des ${name}`
  if (art === 'le') return `du ${name}`
  if (art === 'la') return `de la ${name}`
  if (art === "l'") return `de l'${name}`
  return startsWithVowel(name) ? `d'${name}` : `de ${name}`
}

export const fr: Grammar = {
  of,
  list: (items) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`,
  plural: (noun) => `${noun}s`,
  direction: (dir) => (dir === 'asc' ? 'croissant' : 'décroissant'),
  cap,
}
