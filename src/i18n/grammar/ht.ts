import type { Grammar } from './index'

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Kreyòl ayisyen (orthographe IPN). Possession par juxtaposition : « kapital Kiba ». L'article
 * défini est postposé et varie (a / an / la / lan / nan) — on le laisse de côté pour le contenu
 * généré (à valider par un locuteur natif). */
export const ht: Grammar = {
  of: (name) => name,
  list: (items) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ak ${items[items.length - 1]}`,
  plural: (noun) => noun, // le pluriel se marque avec la particule « yo » (dans les gabarits)
  direction: (dir) => (dir === 'asc' ? 'k ap monte' : 'k ap desann'),
  cap,
}
