import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useT } from '../i18n'
import { supabase } from '../utils/supabase'

interface AuthPanelProps {
  session: Session | null
}

/** Connexion optionnelle au même compte qu'Oliver Quiz (email + mot de passe) : synchronise le
 *  profil dans le cloud. Pas d'inscription ici — les comptes se créent sur Oliver Quiz. */
export function AuthPanel({ session }: AuthPanelProps) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) {
    return (
      <div className="auth-panel">
        <p className="auth-status">☁️ {t('auth.connectedAs', { email: session.user.email ?? '' })}</p>
        <button type="button" className="secondary" onClick={() => supabase.auth.signOut()}>{t('auth.signOut')}</button>
      </div>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(t('auth.error'))
    setLoading(false)
  }

  return (
    <div className="auth-panel">
      <p className="auth-hint">{t('auth.hint')}</p>
      <form className="auth-form" onSubmit={submit}>
        <label>{t('auth.email')}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        <label>{t('auth.password')}
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? t('common.saving') : t('auth.signIn')}</button>
      </form>
    </div>
  )
}
