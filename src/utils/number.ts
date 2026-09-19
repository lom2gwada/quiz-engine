import { DEFAULT_LOCALE, type Locale } from '../i18n/locale'

let currentLocale: Locale = DEFAULT_LOCALE
const cache = new Map<Locale, Intl.NumberFormat>()

/** Posé par `LocaleProvider` : la locale utilisée par `formatNumber` quand aucune n'est passée. */
export function setNumberLocale(locale: Locale): void {
  currentLocale = locale
}

function formatter(locale: Locale): Intl.NumberFormat {
  let nf = cache.get(locale)
  if (!nf) {
    nf = new Intl.NumberFormat(locale)
    cache.set(locale, nf)
  }
  return nf
}

/** Sépare les milliers selon la locale. Les nombres < 1000 sont inchangés.
 * En `fr`, `Intl` groupe avec une espace fine insécable (U+202F) quasi invisible aux petites
 * tailles → on la remplace par une insécable normale (U+00A0). No-op pour les autres locales. */
export function formatNumber(value: number, locale: Locale = currentLocale, maximumFractionDigits?: number): string {
  if (!Number.isFinite(value)) return String(value)
  const nf = maximumFractionDigits === undefined ? formatter(locale) : new Intl.NumberFormat(locale, { maximumFractionDigits })
  return nf.format(value).replace(/ /g, ' ')
}

// Nombre de décimales à conserver pour certaines unités : la précision brute du CSV (ex. 4
// décimales pour une coordonnée) donne une fausse impression de précision dans un quiz de
// culture générale — personne n'est censé connaître une longitude au mètre près. `°` est
// universel (jamais traduit, cf. `elements.i18n.ts`), donc une seule clé suffit pour toutes
// les locales.
const UNIT_DECIMALS: Record<string, number> = { '°': 1 }

/** Valeur numérique d'un quiz : séparée par milliers, sauf les années (`isYear`) laissées
 * brutes. `unit` (déjà résolu pour l'affichage, cf. `data.unit()`) borne le nombre de décimales
 * pour certaines unités (voir `UNIT_DECIMALS`) — n'affecte que l'affichage, jamais les valeurs
 * utilisées pour les calculs (distracteurs, tolérance, tri). */
export function formatNumericValue(value: number, isYear?: boolean, locale?: Locale, unit?: string): string {
  if (isYear) return String(value)
  return formatNumber(value, locale, unit ? UNIT_DECIMALS[unit] : undefined)
}
