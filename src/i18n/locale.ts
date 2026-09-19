/** Une locale est une chaîne BCP-47 courte ('fr', 'en', 'es', 'nl', 'ht'…). Volontairement
 * ouverte : ajouter une langue ne change pas ce type. */
export type Locale = string

export const DEFAULT_LOCALE: Locale = 'fr'

/** Locales réellement câblées (chrome + génération + données). Alimente le sélecteur de langue.
 * On y ajoute une entrée quand une langue est **complète** — cf. `docs/i18n-plan.md`. */
export const SUPPORTED_LOCALES: Locale[] = ['fr', 'en', 'es', 'nl', 'ht']

export const LOCALE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  nl: 'Nederlands',
  ht: 'Kreyòl',
}

/** Résout la locale : préférence du profil → langue du navigateur → défaut. */
export function resolveLocale(profileLocale?: string | null): Locale {
  const candidates = [profileLocale, typeof navigator !== 'undefined' ? navigator.language : undefined]
  for (const candidate of candidates) {
    const short = candidate?.toLowerCase().split('-')[0]
    if (short && SUPPORTED_LOCALES.includes(short)) return short
  }
  return DEFAULT_LOCALE
}

/** Pose `<html lang>` (analogue de `applyTheme`). */
export function applyLocale(locale: Locale): void {
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}
