import { engineConfig } from '../config'
import { useState } from 'react'
import { useT } from '../i18n'
import { supabase } from '../utils/supabase'

/** Porte d'entrée obligatoire de l'app (comme Oliver Quiz) : email + mot de passe, même compte
 *  que sur Oliver Quiz. Un lien d'invité (`?guest=`) contourne cet écran — voir `AuthGate`. */
export function Login() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) setError(t('auth.error'))
    setLoading(false)
  }

  return <main className="app-shell">
    <section className="login-page">
      <p className="eyebrow">{engineConfig().appName.toUpperCase()}</p>
      <h1>{t('auth.gateTitle')}</h1>
      <form onSubmit={submit}>
        <label>{t('auth.email')}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        <label>{t('auth.password')}
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? t('common.saving') : t('auth.signIn')}</button>
      </form>
    </section>
  </main>
}
