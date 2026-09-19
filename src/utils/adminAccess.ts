import { rpcName } from '../config'
import { supabase } from './supabase'

/** Vrai si le compte connecté est admin de l'appli (table <prefixe>_admins, non gérable depuis
 *  l'appli — cf. migration). `false` pour tout le monde par défaut, y compris hors-ligne/erreur. */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc(rpcName('is_%_admin'))
  if (error) return false
  return data === true
}
