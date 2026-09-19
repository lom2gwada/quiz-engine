import type { Locale } from '../i18n/locale'

export type Theme = 'lagon' | 'carte'

export interface Profile {
  pseudo: string
  avatar: string
  theme: Theme
  locale: Locale
}
