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

/** Comparaison de réponse propre à une catégorie (voir `Dataset.answerMatchers`) : la réponse tapée correspond-elle à l'une des attendues ? */
export type AnswerMatcher = (given: string, expected: string[]) => boolean

let matchers: Record<string, AnswerMatcher> = {}

/** Pose les comparateurs du jeu de données courant (appelé par l'appli à chaque changement de jeu de données). */
export function setAnswerMatchers(next: Record<string, AnswerMatcher> | undefined): void {
  matchers = next ?? {}
}

/** Réponse à une question à saisie : le comparateur de la catégorie s'il y en a un (notations métier : configuration électronique,
 *  formules…), sinon `matchesExpected`. */
export function matchAnswer(categoryId: string, given: string, expected: string[], caseSensitive: boolean): boolean {
  const custom = matchers[categoryId]
  return custom ? custom(given, expected) : matchesExpected(given, expected, caseSensitive)
}

const NAME_SUFFIX = /^(jr\.?|sr\.?|junior|senior|ii|iii|iv)$/i

/** Nom de famille d'un nom de personne : son dernier mot (« Luis Abinader » → « Abinader », « Jean-Pierre Lacroix » → « Lacroix »), un suffixe
 *  « Jr » / « III » étant ignoré. Chaîne vide s'il n'y a qu'un mot : il n'y a alors rien de plus à accepter. */
export function lastNameOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter((word) => !NAME_SUFFIX.test(word))
  return words.length > 1 ? words[words.length - 1] : ''
}

/** Comparateur pour une catégorie de personnes (président, Premier ministre…) : le nom complet, **ou le nom de famille seul**, avec la
 *  tolérance habituelle (casse, accents, une faute de frappe). Le prénom seul reste refusé. */
export const acceptLastName: AnswerMatcher = (given, expected) =>
  matchesExpected(given, [...expected, ...expected.map(lastNameOf).filter(Boolean)], false)

/** Comparateurs « nom de famille accepté » pour les catégories d'un jeu de données (`Dataset.lastNameCategories`). */
export function lastNameMatchers(categoryIds: string[] | undefined): Record<string, AnswerMatcher> {
  return Object.fromEntries((categoryIds ?? []).map((id) => [id, acceptLastName]))
}
