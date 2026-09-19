import type { Grammar } from './index'

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Néerlandais : possession en « van X » (ou « van de X » quand l'article traduit vaut « de »,
 * p. ex. van de Bahama's). Grammaire simple, pas de contraction. */
export const nl: Grammar = {
  of: (name, article) => (article ? `van ${article} ${name}` : `van ${name}`),
  list: (items) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`,
  plural: (noun) => (/[aeiou]$/i.test(noun) ? `${noun}’s` : `${noun}en`),
  direction: (dir) => (dir === 'asc' ? 'oplopend' : 'aflopend'),
  cap,
}
