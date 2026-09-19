import { engineConfig } from '../config'
import { useEffect, useState } from 'react'
import { useLocale, useT } from '../i18n'
import { createGuestPass, deleteGuestPass, guestPassUrl, listGuestPasses } from '../utils/guestPass'
import type { GuestPassRow } from '../utils/guestPass'

interface GuestPassPanelProps {
  userId: string
}

/** Génère/liste/révoque des liens d'accès temporaire (sans compte) au compte connecté :
 *  visible uniquement pour un utilisateur réellement connecté (pas un invité). */
export function GuestPassPanel({ userId }: GuestPassPanelProps) {
  const t = useT()
  const locale = useLocale()
  const [passes, setPasses] = useState<GuestPassRow[] | null>(null)
  const [hours, setHours] = useState(24)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const load = () => listGuestPasses().then(setPasses).catch(() => setError(t('guest.loadError')))
  useEffect(() => { load() }, [])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      await createGuestPass(userId, hours, label)
      setLabel('')
      await load()
    } catch {
      setError(t('guest.createError'))
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (token: string) => {
    await deleteGuestPass(token).catch(() => {})
    await load()
  }

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(guestPassUrl(token))
      setCopiedToken(token)
      setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 2000)
    } catch {
      /* presse-papiers indisponible : le lien reste affichable/copiable à la main ailleurs */
    }
  }

  // Ne montre que les liens encore valides (le cloud garde les expirés jusqu'à nettoyage manuel).
  const active = passes?.filter((pass) => new Date(pass.expires_at).getTime() > Date.now()) ?? null

  return <div className="guest-pass-panel">
    <h3>{t('guest.title')}</h3>
    <p className="guest-pass-hint">{t('guest.hint', { app: engineConfig().appName })}</p>
    <form className="guest-pass-form" onSubmit={create}>
      <label>{t('guest.duration')}
        <select value={hours} onChange={(event) => setHours(Number(event.target.value))}>
          <option value={24}>{t('guest.duration.24h')}</option>
          <option value={72}>{t('guest.duration.3d')}</option>
          <option value={168}>{t('guest.duration.7d')}</option>
        </select>
      </label>
      <input type="text" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('guest.labelPlaceholder')} maxLength={40} />
      <button type="submit" disabled={creating}>{creating ? t('common.saving') : t('guest.create')}</button>
    </form>
    {error && <p className="alert" role="alert">{error}</p>}
    {active && active.length > 0 && <ul className="guest-pass-list">
      {active.map((pass) => <li className="guest-pass-item" key={pass.token}>
        <span className="guest-pass-label">{pass.label || t('guest.title')}</span>
        <span className="guest-pass-expiry">{t('guest.expiresAt', { date: new Date(pass.expires_at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}</span>
        <button type="button" className="secondary" onClick={() => copy(pass.token)}>{copiedToken === pass.token ? t('guest.copied') : t('guest.copy')}</button>
        <button type="button" className="secondary" onClick={() => revoke(pass.token)}>{t('guest.revoke')}</button>
      </li>)}
    </ul>}
    {active && active.length === 0 && <p className="guest-pass-empty">{t('guest.empty')}</p>}
  </div>
}
