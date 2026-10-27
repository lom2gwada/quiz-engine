/** Mêle deux séries déjà ordonnées : une part `share` (0–1) de la sortie vient de `boosted`, le reste de `rest`, chacune gardant son
 *  ordre. Sert à donner un poids minimal à des catégories rares (les questions visuelles) dans un tirage « toutes catégories » :
 *  sans cela, elles se noient (38 drapeaux parmi des milliers de questions chiffrées). Quand une série est épuisée, l'autre continue.
 *  `phase` (0–1, aléatoire par défaut) décale le premier tirage d'une question « boostée » : sur une partie courte, la part est
 *  respectée en moyenne plutôt que toujours à zéro. */
export function blendByShare<T>(rest: T[], boosted: T[], share: number, phase: number = Math.random()): T[] {
  const rate = Math.min(1, Math.max(0, share))
  const out: T[] = []
  let credit = phase
  let r = 0
  let b = 0
  while (r < rest.length || b < boosted.length) {
    credit += rate
    if (b < boosted.length && (credit >= 1 || r >= rest.length)) { out.push(boosted[b]); b += 1; credit = Math.max(0, credit - 1) } else { out.push(rest[r]); r += 1 }
  }
  return out
}
