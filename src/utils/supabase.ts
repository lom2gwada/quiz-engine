import { createClient } from '@supabase/supabase-js'

// Projet Supabase partagé avec Oliver Quiz (même auth.users, tables préfixées par appli
// (cf. config.ts)) : un compte créé sur l'une des deux applis fonctionne sur l'autre.
// Clé « publishable » : conçue pour être embarquée côté client, protégée par les policies RLS
// (pas un secret — cf. https://supabase.com/docs/guides/api/api-keys).
const SUPABASE_URL = 'https://cjfjcfxekfxcpkpdpjse.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ftHE_1chDX-OiT_F_eX9wg_B_QBoLRh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
