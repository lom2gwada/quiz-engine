import { useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile, Theme } from '../types/profile'
import type { Locale } from '../i18n/locale'
import { LOCALE_LABELS, SUPPORTED_LOCALES, resolveLocale } from '../i18n/locale'
import { useT } from '../i18n'
import { playClick } from '../utils/sound'
import { applyTheme } from '../utils/theme'
import { AuthPanel } from './AuthPanel'
import { GuestPassPanel } from './GuestPassPanel'

// Grille orientée Caraïbes / voyage, groupée par thème (une ligne visuelle ≈ un groupe) :
// visages + faune marine · faune de terre + paysage d'île · eau + voyage/navigation + soleil.
export const AVATAR_OPTIONS = [
  '🙂', '😎', '🐠', '🦈', '🐳', '🦀', '🐚', '🐢',
  '🦜', '🦩', '🦋', '🦎', '🏝️', '🌺', '🌋', '🥥',
  '🌊', '🌎', '✈️', '⛵', '⚓', '🧭', '🏴‍☠️', '☀️',
]

type Segmenter = { segment: (input: string) => Iterable<{ segment: string }> }
const SegmenterCtor = (Intl as { Segmenter?: new (locale?: string, opts?: { granularity: 'grapheme' }) => Segmenter }).Segmenter

/** Premier « caractère visible » (grapheme cluster) d'une chaîne — garde les emoji ZWJ (🏴‍☠️)
 *  entiers là où c'est possible, sinon retombe sur le premier point de code. */
function firstGrapheme(value: string): string {
  if (SegmenterCtor) {
    for (const { segment } of new SegmenterCtor(undefined, { granularity: 'grapheme' }).segment(value)) return segment
    return ''
  }
  return Array.from(value)[0] ?? ''
}

const HEX_TOKEN = /^(u\+?)?([0-9a-f]{2,6})$/i

/** Résout la saisie du champ libre en un seul emoji.
 *  - un ou plusieurs points de code hexadécimaux (« U+1F984 », « 1F984 », « 1f3f4 200d 2620 fe0f »)
 *    → le caractère correspondant (gère les séquences ZWJ) ; '' si le point de code est inutilisable ;
 *  - sinon, le premier « caractère visible » de ce qui est collé (emoji tapé au clavier).
 *  Renvoie '' si vide ou invalide. Sans préfixe « U+ », une suite trop courte ou sans chiffre
 *  (« abc », « cafe ») est traitée comme un caractère collé, pas comme un code. */
export function resolveAvatarInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // « U+1F984 » : le « + » fait partie du préfixe — on le colle avant de découper sur «  » / « + ».
  const points = trimmed.replace(/\bu\s*\+\s*/gi, 'U').split(/[\s+]+/).map((token) => {
    const match = token.match(HEX_TOKEN)
    if (!match) return null
    const [, prefix, hex] = match
    if (!prefix && !(hex.length >= 4 && /\d/.test(hex))) return null
    return parseInt(hex, 16)
  })

  if (points.every((cp): cp is number => cp !== null)) {
    const usable = points.every((cp) => cp >= 0x20 && cp <= 0x10ffff && (cp < 0xd800 || cp > 0xdfff))
    if (!usable) return ''
    try {
      return String.fromCodePoint(...points).trim()
    } catch {
      return ''
    }
  }

  return firstGrapheme(trimmed).trim()
}

interface ProfilePageProps {
  profile: Profile | null
  session: Session | null
  onBack: () => void
  onSave: (profile: Profile) => Promise<void>
  onViewHistory: () => void
}

export function ProfilePage({ profile, session, onBack, onSave, onViewHistory }: ProfilePageProps) {
  const t = useT()
  const [pseudo, setPseudo] = useState(profile?.pseudo ?? '')
  const initialAvatar = profile?.avatar || AVATAR_OPTIONS[0]
  const [avatar, setAvatar] = useState(initialAvatar)
  // Pré-remplit le champ libre si l'avatar enregistré n'est pas dans la grille.
  const [customRaw, setCustomRaw] = useState(AVATAR_OPTIONS.includes(initialAvatar) ? '' : initialAvatar)
  const [theme, setTheme] = useState<Theme>(profile?.theme ?? 'lagon')
  const [locale, setLocale] = useState<Locale>(profile?.locale ?? resolveLocale())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const customAvatar = useMemo(() => resolveAvatarInput(customRaw), [customRaw])
  const customSelected = customAvatar !== '' && avatar === customAvatar && !AVATAR_OPTIONS.includes(avatar)

  const pickAvatar = (next: string) => { playClick(); setAvatar(next); setSaved(false) }
  const changeCustom = (raw: string) => {
    setCustomRaw(raw)
    setSaved(false)
    const resolved = resolveAvatarInput(raw)
    if (resolved) setAvatar(resolved)
  }

  const previewTheme = (next: Theme) => { playClick(); setTheme(next); applyTheme(next); setSaved(false) }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      await onSave({ pseudo: pseudo.trim(), avatar, theme, locale })
      setSaved(true)
    } catch {
      setError(t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return <section className="stats-page">
    <div className="stats-header">
      <h2>{t('profile.title')}</h2>
      <button type="button" className="secondary" onClick={onBack}>{t('common.back')}</button>
    </div>
    <div className="nav-links">
      <button type="button" className="secondary" onClick={onViewHistory}>🕓 {t('nav.history')}</button>
    </div>
    <AuthPanel session={session} />
    {session && <GuestPassPanel userId={session.user.id} />}
    <form className="profile-form" onSubmit={submit}>
      <label>{t('profile.pseudo')}
        <input value={pseudo} onChange={(event) => { setPseudo(event.target.value); setSaved(false) }} required maxLength={30} placeholder={t('profile.pseudoPlaceholder')} />
      </label>
      <fieldset className="avatar-picker">
        <legend>{t('profile.avatar')}</legend>
        <div className="avatar-options">
          {AVATAR_OPTIONS.map((option) => <label key={option} className="avatar-option">
            <input type="radio" name="avatar" value={option} checked={avatar === option} onChange={() => pickAvatar(option)} />
            <span>{option}</span>
          </label>)}
        </div>
        <div className="avatar-custom">
          <input
            type="text"
            className="avatar-custom-input"
            value={customRaw}
            onChange={(event) => changeCustom(event.target.value)}
            placeholder="🦄  ·  U+1F984"
            aria-label={t('profile.avatarCustom')}
            spellCheck={false}
            autoComplete="off"
          />
          <span className={`avatar-custom-preview${customSelected ? ' is-selected' : ''}`} aria-hidden="true">
            {customAvatar || '·'}
          </span>
        </div>
        <p className="avatar-custom-hint">{t('profile.avatarCustom')}</p>
      </fieldset>
      <label className="profile-language">{t('profile.language')}
        <select value={locale} onChange={(event) => { playClick(); setLocale(event.target.value); setSaved(false) }}>
          {SUPPORTED_LOCALES.map((code) => <option key={code} value={code}>{LOCALE_LABELS[code] ?? code}</option>)}
        </select>
      </label>
      <fieldset className="theme-picker">
        <legend>{t('profile.theme')}</legend>
        <div className="theme-options">
          <label className="theme-option">
            <input type="radio" name="theme" checked={theme === 'lagon'} onChange={() => previewTheme('lagon')} />
            {t('profile.themeLagon')}
          </label>
          <label className="theme-option">
            <input type="radio" name="theme" checked={theme === 'carte'} onChange={() => previewTheme('carte')} />
            {t('profile.themeCarte')}
          </label>
        </div>
      </fieldset>
      {error && <p className="alert" role="alert">{error}</p>}
      {saved && !error && <p className="profile-saved">{t('profile.saved')}</p>}
      <button type="submit" disabled={saving || !pseudo.trim()}>{saving ? t('common.saving') : t('common.save')}</button>
    </form>
  </section>
}
