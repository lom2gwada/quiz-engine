import { getGrammar } from './grammar'
import { DEFAULT_LOCALE, type Locale } from './locale'
import { type DataI18n, trValue } from './data'

/** Un atome multivaleur peut porter une annotation informative entre parenthèses en fin de
 * cellule (ex. « christianisme (85 %) ») : jamais traduite ni utilisée par le générateur (ça
 * ferait des distracteurs quasi-identiques d'un territoire à l'autre, ou une « valeur unique »
 * artificielle) — réservée à l'affichage en fiche, ré-accolée après traduction du nom. */
export function splitAnnotation(raw: string): { name: string; annotation: string } {
  const match = raw.match(/^(.*?)\s*(\([^()]*\))$/)
  return match ? { name: match[1], annotation: match[2] } : { name: raw, annotation: '' }
}

/** Traducteur d'un jeu de données pour une locale donnée. Même logique que celle câblée dans
 * `generateQuiz` — partagée avec les fiches pour que le quiz et les fiches traduisent les mêmes
 * données de la même façon. Repli systématique sur le français. */
export interface DatasetI18n {
  locale: Locale
  /** Valeur de cellule texte (nom, capitale, monnaie, langue…). */
  value: (raw: string) => string
  /** Libellé de colonne (minuscule ; `grammar.cap` le capitalise si besoin). */
  label: (rawLabel: string) => string
  /** Unité d'une colonne numérique (« Mds $ » → « bn $ »…). */
  unit: (rawUnit: string) => string
  /** Article de tête du sujet, résolu pour la locale. `csvArticle` = colonne `article` du CSV
   *  (n'alimente que le français). */
  article: (canonicalName: string, csvArticle?: string) => string
  /** Sujet avec son article : « la Guadeloupe » / « the Bahamas » / « Guadeloupe ». */
  subject: (canonicalName: string, csvArticle?: string) => string
  /** « de la Guadeloupe » / « of Guadeloupe » (via la grammaire de la locale). */
  ofSubject: (canonicalName: string, csvArticle?: string) => string
}

export function makeDatasetI18n(i18n: DataI18n | undefined, locale: Locale = DEFAULT_LOCALE): DatasetI18n {
  const grammar = getGrammar(locale)
  const value = (raw: string): string => trValue(i18n, raw, locale)
  const label = (rawLabel: string): string => i18n?.columnLabels[rawLabel]?.[locale] ?? rawLabel
  const unit = (rawUnit: string): string => i18n?.units?.[rawUnit]?.[locale] ?? rawUnit
  const article = (name: string, csvArticle?: string): string =>
    i18n?.articles[name]?.[locale] ?? (locale === DEFAULT_LOCALE ? (csvArticle ?? '') : '')
  // Nom commun en milieu de phrase : minuscule (« de l'hydrogène ») ; nom propre : tel quel.
  const inSentence = (name: string): string => (i18n?.commonNouns ? value(name).toLocaleLowerCase(locale) : value(name))
  const subject = (name: string, csvArticle?: string): string => {
    const art = article(name, csvArticle)
    return art ? `${art} ${inSentence(name)}` : inSentence(name)
  }
  const ofSubject = (name: string, csvArticle?: string): string => grammar.of(inSentence(name), article(name, csvArticle))
  return { locale, value, label, unit, article, subject, ofSubject }
}
