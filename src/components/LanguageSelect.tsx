import { useT } from '../i18n'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '../i18n/locale'

/** Sélecteur de langue compact (en-tête, écran de connexion) : une liste des langues prises en charge, chacune dans sa propre langue. */
export function LanguageSelect({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  const t = useT()
  return <label className="language-select">
    <span aria-hidden="true">🌐</span>
    <select value={locale} onChange={(event) => onChange(event.target.value)} aria-label={t('profile.language')} title={t('profile.language')}>
      {SUPPORTED_LOCALES.map((code) => <option key={code} value={code}>{LOCALE_LABELS[code] ?? code}</option>)}
    </select>
  </label>
}
