import { storageKey } from '../config'

/** Après un déploiement, un onglet resté ouvert demande des fichiers (`FicheModal-ab12.js`…) qui n'existent plus sur le serveur :
 *  l'import dynamique échoue, React démonte tout et l'écran reste vide. Le message dépend du navigateur. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk .* failed/i.test(message)
}

/** Un rechargement automatique par minute au plus : si le serveur sert encore l'ancienne version (cache), on n'enchaîne pas les rechargements. */
const RELOAD_COOLDOWN_MS = 60_000

export function canReload(lastReloadAt: number | null, now: number): boolean {
  return lastReloadAt === null || now - lastReloadAt > RELOAD_COOLDOWN_MS
}

/** Recharge la page pour récupérer la nouvelle version ; `false` si on vient déjà de le faire (l'appelant affiche alors le bouton « Recharger »). */
export function reloadForNewVersion(): boolean {
  const now = Date.now()
  let last: number | null = null
  try {
    const stored = Number(sessionStorage.getItem(storageKey('stale-reload')))
    last = Number.isFinite(stored) && stored > 0 ? stored : null
  } catch { /* stockage indisponible : on tente quand même un rechargement */ }
  if (!canReload(last, now)) return false
  try { sessionStorage.setItem(storageKey('stale-reload'), String(now)) } catch { /* non bloquant */ }
  window.location.reload()
  return true
}
