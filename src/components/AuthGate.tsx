import { useEffect, useState } from 'react'
import App from '../App'
import type { QuizAppSpec } from '../types/app'
import { Login } from './Login'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { checkGuestPass, hasGuestPassInSession, markGuestPassInSession } from '../utils/guestPass'

/** Porte d'entrée de l'app : connexion obligatoire, sauf lien d'invité valide (`?guest=<token>`,
 *  vérifié côté cloud) — l'invité entre alors dans l'app exactement comme un visiteur hors-ligne
 *  (pas de session, tout reste local, aucun accès aux données du compte réel). */
export function AuthGate({ spec }: { spec: QuizAppSpec }) {
  const { session, loading } = useAuth()
  const [guestChecked, setGuestChecked] = useState(false)
  const [guestValid, setGuestValid] = useState(false)
  const t = useT()

  useEffect(() => {
    if (hasGuestPassInSession()) { setGuestValid(true); setGuestChecked(true); return }
    const token = new URLSearchParams(window.location.search).get('guest')
    if (!token) { setGuestChecked(true); return }
    checkGuestPass(token).then((valid) => {
      if (valid) {
        markGuestPassInSession()
        window.history.replaceState(null, '', window.location.pathname)
      }
      setGuestValid(valid)
      setGuestChecked(true)
    })
  }, [])

  if (loading || !guestChecked) return <main className="app-shell"><p>{t('common.loading')}</p></main>
  if (session) return <App spec={spec} session={session} />
  if (guestValid) return <App spec={spec} session={null} />
  return <Login />
}
