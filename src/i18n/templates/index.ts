import { DEFAULT_LOCALE, type Locale } from '../locale'
import { fr } from './fr'
import { en } from './en'
import { es } from './es'
import { nl } from './nl'
import { ht } from './ht'

/** Gabarits de formulation des questions générées (énoncé, explication, libellé neutre,
 * texte alternatif, description). SOURCE = `fr` ; les autres locales fournissent les mêmes
 * clés (`TemplateKey` force la complétude). Placeholders : `{clé}` — voir `fill`. */
export type TemplateKey = keyof typeof fr

const TEMPLATES: Record<string, Record<TemplateKey, string>> = { fr, en, es, nl, ht }

export function getTemplates(locale: Locale = DEFAULT_LOCALE): Record<TemplateKey, string> {
  return TEMPLATES[locale] ?? TEMPLATES[DEFAULT_LOCALE]
}

export type FillParams = Record<string, string | number>

/** Remplace chaque `{clé}` par sa valeur. Une clé absente est laissée telle quelle
 * (`{clé}`) pour rendre l'oubli visible. */
export function fill(template: string, params: FillParams): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in params ? String(params[key]) : whole))
}
