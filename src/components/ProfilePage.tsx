import { useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile, Theme } from '../types/profile'
import type { Locale } from '../i18n/locale'
import { LOCALE_LABELS, SUPPORTED_LOCALES, resolveLocale } from '../i18n/locale'
import { peekEngineConfig } from '../config'
import { useT } from '../i18n'
import { playClick } from '../utils/sound'
import { applyTheme } from '../utils/theme'
import type { OwnedBadges } from '../utils/badges'
import { AuthPanel } from './AuthPanel'
import { BadgesPanel } from './BadgesPanel'
import { GuestPassPanel } from './GuestPassPanel'

// Grille par défaut, orientée Caraïbes / voyage et groupée par thème (une ligne visuelle ≈ un groupe) :
// visages + faune marine · faune de terre + paysage d'île · eau + voyage/navigation + soleil.
// Une appli fournit la sienne via `EngineConfig.avatars`.
const DEFAULT_AVATARS = [
  '🙂', '😎', '🐠', '🦈', '🐳', '🦀', '🐚', '🐢',
  '🦜', '🦩', '🦋', '🦎', '🏝️', '🌺', '🌋', '🥥',
  '🌊', '🌎', '✈️', '⛵', '⚓', '🧭', '🏴‍☠️', '☀️',
]

const avatarOptions = (): string[] => peekEngineConfig()?.avatars ?? DEFAULT_AVATARS

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

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

/** Résout la saisie du champ libre en un seul emoji : le premier « caractère visible » de ce qui est tapé ou collé
 *  (les emoji ZWJ comme 🏴‍☠️ restent entiers). '' si c'est vide ou que ce n'est pas un emoji. */
export function resolveAvatarInput(raw: string): string {
  const first = firstGrapheme(raw.trim()).trim()
  return EMOJI.test(first) ? first : ''
}

interface ProfilePageProps {
  profile: Profile | null
  session: Session | null
  onBack: () => void
  onSave: (profile: Profile) => Promise<void>
  onViewHistory: () => void
  /** Badges obtenus ; absent : pas de section badges. */
  badges?: OwnedBadges
  /** Catégories du quiz, pour la progression des badges « globe-trotter » ; absent : pas de progression chiffrée. */
  categoryIds?: string[]
}

export function ProfilePage({ profile, session, onBack, onSave, onViewHistory, badges, categoryIds }: ProfilePageProps) {
  const t = useT()
  const [pseudo, setPseudo] = useState(profile?.pseudo ?? '')
  const options = avatarOptions()
  const initialAvatar = profile?.avatar || options[0]
  const [avatar, setAvatar] = useState(initialAvatar)
  // Pré-remplit le champ libre si l'avatar enregistré n'est pas dans la grille.
  const [customRaw, setCustomRaw] = useState(options.includes(initialAvatar) ? '' : initialAvatar)
  const [theme, setTheme] = useState<Theme>(profile?.theme ?? 'lagon')
  const [locale, setLocale] = useState<Locale>(profile?.locale ?? resolveLocale())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const customAvatar = useMemo(() => resolveAvatarInput(customRaw), [customRaw])
  const customSelected = customAvatar !== '' && avatar === customAvatar && !options.includes(avatar)

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
    <section className="profile-section" aria-labelledby="profile-account">
      <h3 id="profile-account">{t('profile.section.account')}</h3>
      <AuthPanel session={session} />
    </section>
    <section className="profile-section" aria-labelledby="profile-appearance">
      <h3 id="profile-appearance">{t('profile.section.appearance')}</h3>
    <form className="profile-form" onSubmit={submit}>
      <label>{t('profile.pseudo')}
        <input value={pseudo} onChange={(event) => { setPseudo(event.target.value); setSaved(false) }} required maxLength={30} placeholder={t('profile.pseudoPlaceholder')} />
      </label>
      <fieldset className="avatar-picker">
        <legend>{t('profile.avatar')}</legend>
        <div className="avatar-options">
          {options.map((option) => <label key={option} className="avatar-option">
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
            placeholder="🦄"
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
    {session && <section className="profile-section" aria-labelledby="profile-share">
      <h3 id="profile-share">{t('profile.section.share')}</h3>
      <GuestPassPanel userId={session.user.id} />
    </section>}
    {badges && <section className="profile-section">
      <BadgesPanel owned={badges} userId={session?.user.id} categoryIds={categoryIds} />
    </section>}
  </section>
}
