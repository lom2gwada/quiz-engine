import type { Locale } from './locale'

/** Traductions d'un jeu de données (sidecar, à côté du CSV — même patron que `shapes.ts` /
 * `aliases.ts`). Indexé par la **valeur française canonique** ; une locale absente retombe
 * sur le français. Ne concerne jamais les nombres. */
export interface DataI18n {
  /** Valeurs de cellules texte : noms de sujets, capitales, monnaies, langues (atome par
   * atome), sommets… « La Havane » → `{ en: 'Havana' }`. */
  values: Record<string, Partial<Record<Locale, string>>>
  /** Article de tête du sujet, par locale. Clé = nom FR du sujet. En anglais : « the » pour
   * « the Bahamas », vide partout ailleurs. */
  articles: Record<string, Partial<Record<Locale, string>>>
  /** Libellé d'une colonne (minuscule — `grammar.cap` le capitalise si besoin). Clé = libellé
   * FR normalisé (`spec.label`). */
  columnLabels: Record<string, Partial<Record<Locale, string>>>
  /** Unité d'une colonne numérique (clé = suffixe FR détecté : « Mds $ », « hab/km² »…).
   * `km²` / `m` / `%` sont universels : inutile de les lister. Optionnel. */
  units?: Record<string, Partial<Record<Locale, string>>>
  /** Les sujets sont des noms communs (éléments chimiques…) et non des noms propres : dans une phrase
   * (« de l'hydrogène », « of iron »), leur initiale reste en minuscule. */
  commonNouns?: boolean
}

/** Résout une valeur pour la locale, avec repli français. */
export function trValue(i18n: DataI18n | undefined, value: string, locale: Locale): string {
  return i18n?.values[value]?.[locale] ?? value
}
