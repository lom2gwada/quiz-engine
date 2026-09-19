import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export interface Auth {
  session: Session | null
  loading: boolean
}

/** Session Supabase optionnelle : reste `null` tant que l'utilisateur ne se connecte pas —
 *  le profil reste alors 100% local, comme avant l'ajout de la synchronisation cloud. */
export function useAuth(): Auth {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
