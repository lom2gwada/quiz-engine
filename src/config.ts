/** Ce qui distingue une application de l'autre au niveau du moteur : à fournir UNE fois, avant tout
 *  rendu (`configureEngine` dans `main.tsx`, et dans le setup des tests). Le moteur ne connaît rien
 *  d'autre d'une application : jeu de données, vues et traductions spécifiques arrivent par le
 *  `QuizAppSpec` (App.tsx) et `messages`. */
export interface EngineConfig {
  /** Préfixe des clés localStorage (`<appId>:profile`, …). Les applis partagent l'origine
   *  `<user>.github.io` : sans préfixe distinct, elles écraseraient mutuellement leur stockage. */
  appId: string
  /** Préfixe des tables / vues / fonctions Supabase (`<prefix>_profiles`, `is_<prefix>_admin`…). */
  tablePrefix: string
  /** Nom affiché de l'appli (« Periodic Quiz ») : écran de connexion, auteur des quiz générés. */
  appName: string
  /** Avatars proposés dans le profil (un emoji chacun, par lignes de 8) ; défaut : la grille voyage / Caraïbes du moteur. */
  avatars?: string[]
  /** Libellés d'interface propres à l'appli, par locale : ajoutent des clés au dictionnaire du moteur
   *  ou en remplacent (libellés de thèmes, texte d'invitation…). */
  messages?: Record<string, Record<string, string>>
}

let current: EngineConfig | null = null

export function configureEngine(config: EngineConfig): void {
  current = config
}

export function engineConfig(): EngineConfig {
  if (!current) throw new Error('quiz-engine : appeler configureEngine() avant toute utilisation.')
  return current
}

/** Clé localStorage propre à l'appli : `storageKey('profile')` → `periodic-quiz:profile`. */
export function storageKey(name: string): string {
  return `${engineConfig().appId}:${name}`
}

/** Nom de table / vue Supabase propre à l'appli : `table('profiles')` → `periodic_profiles`. */
export function table(name: string): string {
  return `${engineConfig().tablePrefix}_${name}`
}

/** Nom de fonction RPC : `rpcName('is_%_admin')` → `is_periodic_admin`. */
export function rpcName(pattern: string): string {
  return pattern.replace('%', engineConfig().tablePrefix)
}

/** Comme `engineConfig`, mais `null` avant configuration (import de module, contexte par défaut). */
export function peekEngineConfig(): EngineConfig | null {
  return current
}
