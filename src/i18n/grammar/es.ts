import type { Grammar } from './index'

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Espagnol : « de X », « de la X » / « de las X », « del X » (de + el). L'article traduit
 * (`elements.i18n.ts`) vaut '', 'el', 'la', 'los' ou 'las'. */
function of(name: string, article?: string): string {
  const art = (article ?? '').trim().toLowerCase()
  if (art === 'el') return `del ${name}`
  if (art) return `de ${art} ${name}`
  return `de ${name}`
}

export const es: Grammar = {
  of,
  list: (items) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`,
  plural: (noun) => (/[aeiouáéíóú]$/i.test(noun) ? `${noun}s` : `${noun}es`),
  direction: (dir) => (dir === 'asc' ? 'ascendente' : 'descendente'),
  cap,
}
