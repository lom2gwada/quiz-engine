import { DEFAULT_LOCALE, type Locale } from '../locale'
import { fr } from './fr'
import { en } from './en'
import { es } from './es'
import { nl } from './nl'
import { ht } from './ht'

/** Petites règles de langue dont la génération de quiz a besoin : contraction de l'article,
 * énumération, pluriel, sens de tri. Une implémentation par famille de langue. */
export interface Grammar {
  /** « de la Guadeloupe » / « du Mexique » / « d'Haïti » (fr) · « of Guadeloupe » (en). */
  of(name: string, article?: string): string
  /** « X, Y et Z » (fr) · « X, Y and Z » (en). */
  list(items: string[]): string
  /** Forme plurielle d'un nom d'élément : « territoires » / « territories ». */
  plural(noun: string, n: number): string
  /** Qualificatif de sens de tri, accordé si besoin : « croissante » / « ascending ». */
  direction(dir: 'asc' | 'desc'): string
  /** Majuscule initiale. */
  cap(s: string): string
}

const GRAMMARS: Record<string, Grammar> = { fr, en, es, nl, ht }

export function getGrammar(locale: Locale = DEFAULT_LOCALE): Grammar {
  return GRAMMARS[locale] ?? GRAMMARS[DEFAULT_LOCALE]
}
