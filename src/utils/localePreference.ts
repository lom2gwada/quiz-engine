import { storageKey } from '../config'
import { SUPPORTED_LOCALES, type Locale } from '../i18n/locale'

const key = () => storageKey('locale')

/** Langue choisie avec le sélecteur (écran de connexion, en-tête), gardée sur l'appareil : elle sert tant qu'il n'y a pas de profil (visiteur,
 *  invité, avant connexion). Une fois connecté, la langue du profil l'emporte. `null` si rien n'a été choisi. */
export function readLocalePreference(): Locale | null {
  try {
    const value = localStorage.getItem(key())
    return value && SUPPORTED_LOCALES.includes(value) ? value : null
  } catch {
    return null
  }
}

export function writeLocalePreference(locale: Locale): void {
  try {
    localStorage.setItem(key(), locale)
  } catch {
    /* navigation privée : le choix ne survit pas au rechargement */
  }
}
