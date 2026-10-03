/** Tolérance de frappe : en dessous de cette longueur (réponse attendue normalisée), pas de faute admise —
 *  « Cuba » / « Cube », « Mali » / « Mala » sont des réponses différentes, pas des fautes. */
export const TYPO_MIN_LENGTH = 5

/** Casse, accents, traits d'union / apostrophes / espaces multiples et article de tête sont ignorés
 *  (« Port-d'Espagne » ≈ « port d'espagne » ; « le peso » ≈ « peso »), sauf en mode sensible. */
export function normalizeAnswer(value: string, caseSensitive: boolean): string {
  const trimmed = value.trim()
  if (caseSensitive) return trimmed
  return trimmed
    .toLocaleLowerCase('fr')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents (diacritiques U+0300–U+036F)
    .replace(/[-'‘’`\s]+/g, ' ') // traits d'union / apostrophes / espaces → une espace
    .replace(/^(le|la|les|l|the) /, '')
    .trim()
}

/** Distance de Damerau-Levenshtein (version « optimal string alignment ») ≤ 1 : une lettre en trop, en moins ou
 *  remplacée, ou deux lettres voisines inversées (la faute de frappe la plus courante, « Bridgetwon »). */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
  }
  const [longer, shorter] = a.length > b.length ? [a, b] : [b, a]
  return longer.slice(i + 1) === shorter.slice(i)
}

/** Une réponse tapée correspond-elle à l'une des réponses attendues ? Exacte après normalisation ; sinon une faute
 *  de frappe est tolérée pour une réponse attendue d'au moins `TYPO_MIN_LENGTH` lettres et sans chiffre (« 6s2 » /
 *  « 6s1 » ou une année à un chiffre près seraient de vraies erreurs, pas des fautes) — jamais en mode sensible. */
export function matchesExpected(answer: string, expected: string[], caseSensitive: boolean): boolean {
  const given = normalizeAnswer(answer, caseSensitive)
  return expected.some((candidate) => {
    const wanted = normalizeAnswer(candidate, caseSensitive)
    if (given === wanted) return true
    if (caseSensitive || wanted.length < TYPO_MIN_LENGTH || /\d/.test(wanted)) return false
    return withinOneEdit(given, wanted)
  })
}
