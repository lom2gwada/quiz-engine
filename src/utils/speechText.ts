import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n, splitAnnotation } from '../i18n/dataset'
import { DEFAULT_LOCALE, type Locale } from '../i18n/locale'
import type { SpeechTemplates } from '../types/app'
import { formatNumber } from './number'
import type { GenSchema, Row } from './quizGenerator'

const MARKER = /\{(\w+)(?::(\d+))?\}/g
const OPTIONAL = /\[([^[\]]*)\]/g

const upperFirst = (text: string, locale: Locale): string => (text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text)

function joinList(items: string[], locale: Locale): string {
  const ListFormat = (Intl as { ListFormat?: new (locale: string, options: { style: string; type: string }) => { format: (list: string[]) => string } }).ListFormat
  return ListFormat ? new ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items) : items.join(', ')
}

/** Locale réellement utilisée pour parler : celle de l'interface si le jeu de données a des phrases pour elle,
 *  sinon le français (texte ET données, pour que la voix ne mélange pas deux langues). */
export function speechLocale(templates: SpeechTemplates | undefined, locale: Locale): Locale {
  return templates?.[locale]?.length ? locale : DEFAULT_LOCALE
}

/** Phrases à lire pour une ligne du jeu de données (fiche d'un sujet), dans l'ordre des gabarits. */
export function buildSpeech(row: Row, schema: GenSchema, i18n: DataI18n | undefined, locale: Locale, templates: SpeechTemplates | undefined): string[] {
  const spoken = speechLocale(templates, locale)
  const templatesForLocale = templates?.[spoken] ?? []
  const data = makeDatasetI18n(i18n, spoken)
  const canonical = row[schema.subjectColumn] ?? ''
  const csvArticle = schema.articleColumn ? row[schema.articleColumn] : undefined

  /** `null` = marqueur sans valeur (colonne vide ou inconnue). */
  const resolve = (key: string, count?: number): string | null => {
    if (key === 'name') return data.subject(canonical, csvArticle)
    if (key === 'Name') return upperFirst(data.subject(canonical, csvArticle), spoken)
    if (key === 'of_name') return data.ofSubject(canonical, csvArticle)
    const spec = schema.columns[key]
    const raw = (row[key] ?? '').trim()
    if (!spec || !raw) return null
    if (spec.multivalueSeparator) {
      const names = raw.split(spec.multivalueSeparator)
        .map((part) => data.value(splitAnnotation(part.trim()).name))
        .filter(Boolean)
      return names.length ? joinList(count ? names.slice(0, count) : names, spoken) : null
    }
    if (spec.kind === 'number') {
      const n = Number(raw.replace(/\s/g, '').replace(',', '.'))
      return Number.isFinite(n) ? (spec.isYear ? String(n) : formatNumber(n, spoken)) : null
    }
    return data.value(raw)
  }

  /** Remplit un gabarit ; `null` si un marqueur est vide. */
  const fill = (template: string): string | null => {
    let missing = false
    const text = template.replace(MARKER, (_, key: string, count?: string) => {
      const value = resolve(key, count ? Number(count) : undefined)
      if (value === null) missing = true
      return value ?? ''
    })
    return missing ? null : text
  }

  return templatesForLocale.flatMap((template) => {
    const withOptionals = template.replace(OPTIONAL, (_, inner: string) => fill(inner) ?? '')
    const sentence = fill(withOptionals)
    return sentence ? [sentence.replace(/\s+/g, ' ').trim()] : []
  })
}
