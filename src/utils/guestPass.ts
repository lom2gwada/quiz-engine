import { rpcName, storageKey, table } from '../config'
import { supabase } from './supabase'

const sessionKey = () => storageKey('guest-pass')

export interface GuestPassRow {
  token: string
  label: string | null
  expires_at: string
  created_at: string
}

/** Vérifie un token invité auprès du cloud (fonction RPC, appelable sans session). */
export async function checkGuestPass(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc(rpcName('check_%_guest_pass'), { p_token: token })
  if (error) return false
  return data === true
}

/** Un token déjà validé cette visite n'a pas besoin d'être revérifié à chaque navigation —
 *  effacé à la fermeture de l'onglet, cohérent avec l'esprit « accès provisoire ». */
export function hasGuestPassInSession(): boolean {
  try {
    return sessionStorage.getItem(sessionKey()) === '1'
  } catch {
    return false
  }
}

export function markGuestPassInSession(): void {
  try {
    sessionStorage.setItem(sessionKey(), '1')
  } catch {
    /* navigation privée : tant pis, revalidé à chaque page dans ce cas */
  }
}

/** Liens créés par l'utilisateur connecté (RLS : uniquement les siens). */
export async function listGuestPasses(): Promise<GuestPassRow[]> {
  const { data, error } = await supabase
    .from(table('guest_passes'))
    .select('token,label,expires_at,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createGuestPass(userId: string, hours: number, label: string): Promise<GuestPassRow> {
  const expires_at = new Date(Date.now() + hours * 3_600_000).toISOString()
  const { data, error } = await supabase
    .from(table('guest_passes'))
    .insert({ created_by: userId, expires_at, label: label.trim() || null })
    .select('token,label,expires_at,created_at')
    .single()
  if (error) throw error
  return data
}

export async function deleteGuestPass(token: string): Promise<void> {
  const { error } = await supabase.from(table('guest_passes')).delete().eq('token', token)
  if (error) throw error
}

/** URL de partage : le lien courant, `?guest=<token>` en plus (pas d'autre paramètre existant à préserver ici). */
export function guestPassUrl(token: string): string {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('guest', token)
  return url.toString()
}
